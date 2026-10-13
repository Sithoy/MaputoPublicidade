import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.core.mail import EmailMessage, send_mail
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.email_connection import cipher
from apps.core.models import (
    EmailConnection,
    PortalNotification,
    StaffEmailSignature,
    SupportConversation,
    SupportMessage,
)
from apps.core.zoho_email_backend import ZohoEmailBackend
from apps.core.zoho_mail import access, send, sync_mail

BASE = '/api/integrations/email/oauth/'


@pytest.fixture(autouse=True)
def approved_staff_signature(staff_user):
    return StaffEmailSignature.objects.create(user=staff_user, display_name='Recepção MP', title='Atendimento', approved=True, approved_by=staff_user)


@pytest.fixture(autouse=True)
def clear_mail_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def email_config(db):
    return EmailConnection.objects.create(pk=1, oauth_client_id='1000.example',
        oauth_secret=cipher().encrypt(b'private-secret').decode(), oauth_refresh=cipher().encrypt(b'private-refresh').decode(),
        oauth_account_id='12345', sending_enabled=True, receiving_enabled=True, receiving_since=timezone.now() - timedelta(minutes=1))


def inbound(message_id='123', thread_id='99', sender='client@example.com'):
    return {'messageId': message_id, 'folderId': '10', 'threadId': thread_id, 'fromAddress': sender,
            'sender': 'Cliente', 'subject': 'Um pedido', 'receivedTime': str(int(timezone.now().timestamp() * 1000))}


@pytest.mark.django_db
class TestZohoTransport:
    def test_activation_requires_verified_connection_and_preserves_start(self, staff_client, email_config):
        before = email_config.receiving_since
        with patch('apps.core.zoho_mail.access', return_value='private-access'), patch('apps.core.zoho_oauth.account', return_value='12345'), patch('apps.core.zoho_oauth.provider', return_value={'data': []}):
            result = staff_client.post(BASE + 'activate/', {'enabled': True}, format='json')
        assert result.status_code == 200
        assert result.data['sending_active'] and result.data['receiving_active']
        assert EmailConnection.objects.get(pk=1).receiving_since == before
        assert staff_client.post(BASE + 'activate/', {'enabled': False}, format='json').status_code == 200
        assert not EmailConnection.objects.get(pk=1).sending_enabled

    def test_activation_permissions_and_no_callback_write(self, authenticated_client, staff_client, email_config, staff_user):
        assert APIClient().post(BASE + 'activate/', {'enabled': True}).status_code == 401
        assert authenticated_client.post(BASE + 'sync/').status_code == 403
        staff_user.profile.staff_role = StaffRole.RECEPTIONIST
        staff_user.profile.save(update_fields=['staff_role'])
        assert staff_client.post(BASE + 'activate/', {'enabled': False}).status_code == 403
        with patch('apps.core.zoho_oauth.sync_mail', create=True):
            email_config.receiving_enabled = False
            email_config.save()
            assert staff_client.post(BASE + 'sync/').status_code == 200

    def test_canonical_sender_and_no_smtp(self, email_config):
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', return_value={'status': {'code': 200}}) as api, patch('smtplib.SMTP') as smtp:
            send(email_config, 'Assunto', 'Olá', ['client@example.com'])
            payload = api.call_args.kwargs['json']
            assert payload['fromAddress'] == 'atendimento@maputopublicidade.com'
            assert payload['toAddress'] == 'client@example.com'
            assert payload['mailFormat'] == 'plaintext'
            smtp.assert_not_called()

    def test_django_notifications_and_cc_bcc_use_same_transport(self, email_config, settings):
        settings.EMAIL_BACKEND = 'apps.core.zoho_email_backend.ZohoEmailBackend'
        with patch('apps.core.zoho_email_backend.send') as transport:
            assert send_mail('Pedido', 'Body', 'old@example.com', ['client@example.com']) == 1
            transport.assert_called_once()
            msg = EmailMessage('Reply', 'Body', 'old@example.com', ['client@example.com'], cc=['cc@example.com'], bcc=['hidden@example.com'])
            assert ZohoEmailBackend().send_messages([msg]) == 1
            assert transport.call_args.kwargs == {'cc': ['cc@example.com'], 'bcc': ['hidden@example.com']}

    def test_inactive_django_transport_preserves_existing_mail_backend(self, email_config, settings):
        email_config.sending_enabled = False
        email_config.save()
        settings.LEGACY_EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
        with patch('apps.core.zoho_email_backend.send') as transport:
            assert ZohoEmailBackend().send_messages([EmailMessage('Test', 'body', 'info@example.com', ['client@example.com'])]) == 1
            transport.assert_not_called()

    def test_access_token_is_cached_encrypted_and_scoped_to_credentials(self, email_config):
        with patch('apps.core.zoho_mail.provider', return_value={'access_token': 'private-access'}) as api:
            assert access(email_config) == 'private-access'
            assert access(email_config) == 'private-access'
            assert api.call_count == 1
            email_config.oauth_refresh = cipher().encrypt(b'new-refresh').decode()
            assert access(email_config) == 'private-access'
            assert api.call_count == 2

    def test_import_is_idempotent_plain_text_and_internal_only(self, email_config, staff_user, client_user, staff_client, authenticated_client):
        rows = {'data': [inbound()]}
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', side_effect=[rows, {'data': {'content': '<div>Olá &amp; obrigado<img src="https://tracker.test/pixel"></div>'}}, rows]):
            assert sync_mail()['imported'] == 1
            assert sync_mail()['imported'] == 0
        message = SupportMessage.objects.get(source='email')
        assert message.body == 'Olá & obrigado'
        assert message.conversation.client_id is None
        assert PortalNotification.objects.filter(recipient=staff_user).count() == 1
        result = staff_client.get('/api/support-conversations/').data['results'][0]
        assert result['channel'] == 'email' and result['email']['address'] == 'client@example.com'
        assert authenticated_client.get(f'/api/support-conversations/{message.conversation_id}/').status_code == 404
        # Even accidental client assignment cannot expose the email channel.
        message.conversation.client = client_user
        message.conversation.save()
        assert authenticated_client.get('/api/support-conversations/').data['count'] == 0

    def test_does_not_import_history_self_sent_or_invalid_addresses(self, email_config):
        old = inbound('111')
        old['receivedTime'] = '1'
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', return_value={'data': [old, inbound('222', sender='atendimento@maputopublicidade.com'), inbound('333', sender='bad-address')]}):
            assert sync_mail()['imported'] == 0
        assert SupportConversation.objects.count() == 0

    def test_failed_import_releases_lease_without_advancing(self, email_config):
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', side_effect=ValidationError('unavailable')):
            with pytest.raises(ValidationError):
                sync_mail()
        email_config.refresh_from_db()
        assert email_config.sync_start == 1
        assert email_config.sync_lock_until is None

    def test_reply_uses_native_thread_endpoint_and_idempotent_request(self, email_config, staff_client, staff_user):
        conversation = SupportConversation.objects.create(channel='email', contact_email='client@example.com', subject='Pedido')
        SupportMessage.objects.create(conversation=conversation, source='email', email_id='12345:333', sender=None, body='Olá')
        key = str(uuid.uuid4())
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', return_value={'status': {'code': 200}}) as api:
            url = f'/api/support-conversations/{conversation.pk}/messages/'
            first = staff_client.post(url, {'body': 'Resposta', 'request_id': key}, format='json')
            assert first.status_code == 201
            assert first.data['delivery_status'] == 'accepted'
            assert api.call_args.args[1].endswith('/messages/333')
            assert api.call_args.kwargs['json']['action'] == 'reply'
            assert staff_client.post(url, {'body': 'Resposta', 'request_id': key}, format='json').status_code == 201
            assert api.call_count == 1
        assert conversation.messages.filter(is_staff=True).get().sender == staff_user

    def test_uncertain_reply_is_not_retried_or_recorded_as_sent(self, email_config, staff_client):
        conversation = SupportConversation.objects.create(channel='email', contact_email='client@example.com', subject='Pedido')
        SupportMessage.objects.create(conversation=conversation, source='email', email_id='12345:333', sender=None, body='Olá')
        key = str(uuid.uuid4())
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', side_effect=ValidationError('Envio não confirmado')) as api:
            url = f'/api/support-conversations/{conversation.pk}/messages/'
            assert staff_client.post(url, {'body': 'Resposta', 'request_id': key}, format='json').status_code == 400
            assert staff_client.post(url, {'body': 'Resposta', 'request_id': key}, format='json').status_code == 400
            assert api.call_count == 1
        assert conversation.messages.filter(is_staff=True).get().delivery_status == 'unconfirmed'
