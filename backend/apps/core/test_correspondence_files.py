from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.roles import StaffRole
from apps.core.email_connection import cipher
from apps.core.models import (
    EmailConnection,
    EmailDraft,
    StaffEmailSignature,
    SupportConversation,
    SupportFile,
    SupportMessage,
)


@pytest.fixture
def email(db):
    conversation = SupportConversation.objects.create(channel='email', contact_email='client@example.com', subject='Pedido')
    SupportMessage.objects.create(conversation=conversation, source='email', body='Pedido', email_id='123:456', email_headers={'folder_id': '789'})
    EmailConnection.objects.create(pk=1, sending_enabled=True, receiving_enabled=True, oauth_account_id='123', oauth_refresh=cipher().encrypt(b'refresh').decode())
    return conversation


def path(conversation):
    return f'/api/support-conversations/{conversation.pk}/'


def upload(api, conversation, name='proposta.pdf', content=b'%PDF-1.4\n%%EOF'):
    return api.post(path(conversation) + 'files/', {'file': SimpleUploadedFile(name, content)}, format='multipart')


@pytest.mark.django_db
class TestCorrespondenceFiles:
    def test_documents_follow_approval_and_role_permissions(self, staff_client, staff_user, email, quote):
        email.quote = quote
        email.save()
        assert staff_client.get(path(email) + 'documents/').data == []
        quote.proposal_stage = 'approved'
        quote.save()
        assert staff_client.get(path(email) + 'documents/').data[0]['key'] == 'proposal'
        with patch('apps.core.documents.build_quote_pdf', return_value=b'%PDF-1.4\n%%EOF'):
            result = staff_client.post(path(email) + 'documents/', {'source': 'proposal'}, format='json')
        assert result.status_code == 201
        quote.proposal_stage = 'returned'
        quote.save()
        assert staff_client.patch(path(email) + 'email-draft/', {'version': 0, 'subject': 'Proposta', 'body': 'Olá', 'attachment_ids': [result.data['id']]}, format='json').status_code == 400
        staff_user.profile.staff_role = StaffRole.PRODUCTION
        staff_user.profile.save()
        assert staff_client.get(path(email) + 'documents/').status_code == 403

    def test_uncertain_send_keeps_file_evidence_and_manual_retry_copies(self, staff_client, staff_user, email):
        StaffEmailSignature.objects.create(user=staff_user, display_name='Maria', title='Atendimento', approved=True)
        file = upload(staff_client, email).data
        staff_client.patch(path(email) + 'email-draft/', {'version': 0, 'subject': 'Proposta', 'body': 'Olá', 'attachment_ids': [file['id']]}, format='json')
        rendered = staff_client.post(path(email) + 'email-preview/', {'version': 1}, format='json').data
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', side_effect=ValueError('timeout')):
            assert staff_client.post(path(email) + 'email-send/', {'version': 1, 'confirmed': True, 'preview_hash': rendered['hash']}, format='json').status_code == 400
        assert SupportFile.objects.get(pk=file['id']).message.delivery_status == 'unconfirmed'
        result = staff_client.post(path(email) + 'email-recover/', {'version': 1, 'confirmed': True, 'outcome': 'not_sent'}, format='json')
        assert result.status_code == 200 and result.data['attachment_ids'][0] != file['id']
        assert SupportFile.objects.get(pk=file['id']).message.delivery_status == 'failed'
        assert SupportFile.objects.get(pk=result.data['attachment_ids'][0]).message_id is None
        assert staff_client.post(path(email) + 'email-preview/', {'version': 2}, format='json').status_code == 200

    def test_private_upload_preview_and_cross_account_scoping(self, staff_client, authenticated_client, client_user):
        conversation = SupportConversation.objects.create(client=client_user, subject='Pedido')
        response = upload(authenticated_client, conversation)
        assert response.status_code == 201
        assert authenticated_client.get(response.data['url']).status_code == 200
        assert 'no-store' in authenticated_client.get(response.data['url'])['Cache-Control']
        foreign = SupportConversation.objects.create(subject='Outra empresa')
        assert authenticated_client.get(path(foreign) + f"files/{response.data['id']}/").status_code == 404
        assert upload(staff_client, conversation, 'bad.svg', b'<svg/>').status_code == 400
        assert upload(staff_client, conversation, content=b'%PDF-' + b'x' * (3 * 1024 * 1024)).status_code == 400

    def test_chat_files_become_immutable_message_evidence(self, authenticated_client, client_user):
        conversation = SupportConversation.objects.create(client=client_user, subject='Pedido')
        file = upload(authenticated_client, conversation).data
        sent = authenticated_client.post(path(conversation) + 'messages/', {'body': 'Veja a referência', 'attachment_ids': [file['id']]}, format='json')
        assert sent.status_code == 201 and sent.data['files'][0]['name'] == 'proposta.pdf'
        assert authenticated_client.post(path(conversation) + 'messages/', {'body': 'Reusar', 'attachment_ids': [file['id']]}, format='json').status_code == 400

    def test_signature_approval_permissions_and_no_unsigned_send(self, staff_client, authenticated_client, staff_user, email):
        endpoint = '/api/staff-email-signatures/'
        assert authenticated_client.get(endpoint).status_code == 403
        signature = {'user_id': staff_user.pk, 'display_name': 'Maria Manuel', 'title': 'Atendimento ao Cliente', 'approved': True}
        assert staff_client.patch(endpoint, signature, format='json').status_code == 200
        record = StaffEmailSignature.objects.get(user=staff_user)
        assert record.approved_by == staff_user
        staff_user.profile.staff_role = StaffRole.RECEPTIONIST
        staff_user.profile.save()
        assert staff_client.patch(endpoint, signature, format='json').status_code == 403
        record.approved = False
        record.save()
        EmailDraft.objects.create(conversation=email, subject='Resposta', body='Olá')
        rendered = staff_client.post(path(email) + 'email-preview/', {'version': 0}, format='json').data
        assert rendered['signature_approved'] is False
        with patch('apps.core.zoho_mail.provider') as provider:
            assert staff_client.post(path(email) + 'email-send/', {'version': 0, 'confirmed': True, 'preview_hash': rendered['hash']}, format='json').status_code == 400
            provider.assert_not_called()

    def test_signed_reviewed_send_includes_files_and_preserves_author(self, staff_client, staff_user, email):
        record = StaffEmailSignature.objects.create(user=staff_user, display_name='Maria Manuel', title='Atendimento', approved=True, approved_by=staff_user)
        file = upload(staff_client, email).data
        response = staff_client.patch(path(email) + 'email-draft/', {'version': 0, 'subject': 'Proposta', 'body': 'Segue a proposta', 'attachment_ids': [file['id']]}, format='json')
        assert response.status_code == 200
        rendered = staff_client.post(path(email) + 'email-preview/', {'version': 1}, format='json').data
        assert 'Maria Manuel' in rendered['html'] and rendered['attachments'][0]['name'] == 'proposta.pdf'
        record.title = 'Nova função'
        record.save()
        assert staff_client.post(path(email) + 'email-send/', {'version': 1, 'confirmed': True, 'preview_hash': rendered['hash']}, format='json').status_code == 400
        rendered = staff_client.post(path(email) + 'email-preview/', {'version': 1}, format='json').data
        def zoho(method, url, **kwargs):
            if url.endswith('/attachments'):
                return {'data': {'storeName': 'store', 'attachmentPath': '/Mail/a', 'attachmentName': 'proposta.pdf'}}
            assert url.endswith('/messages')
            assert 'action' not in kwargs['json']
            assert kwargs['json']['attachments'][0]['storeName'] == 'store'
            assert 'Maria Manuel' in kwargs['json']['content']
            return {'status': {'code': 200}}
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', side_effect=zoho):
            result = staff_client.post(path(email) + 'email-send/', {'version': 1, 'confirmed': True, 'preview_hash': rendered['hash']}, format='json')
        assert result.status_code == 200 and result.data['draft']['attachment_ids'] == []
        message = SupportMessage.objects.get(conversation=email, is_staff=True)
        assert message.sender == staff_user and message.email_headers['prepared_by'] == staff_user.pk
        assert message.email_headers['signature']['staff_name'] == 'Maria Manuel'
        assert SupportFile.objects.get(pk=file['id']).message == message

    def test_inbound_zoho_metadata_is_private_and_bounded(self, staff_client, authenticated_client, email):
        message = email.messages.first()
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', return_value={'data': {'attachments': [{'attachmentId': '111', 'attachmentName': 'arte.png', 'attachmentSize': 100}, {'attachmentId': '222', 'attachmentName': 'macro.exe', 'attachmentSize': 100}]}}):
            result = staff_client.post(path(email) + 'email-files/', {'message_id': message.pk}, format='json')
            assert result.status_code == 200 and len(result.data['files']) == 1
            assert staff_client.post(path(email) + 'email-files/', {'message_id': message.pk}, format='json').status_code == 200
        assert SupportFile.objects.count() == 1
        assert authenticated_client.get(result.data['files'][0]['url']).status_code == 404
