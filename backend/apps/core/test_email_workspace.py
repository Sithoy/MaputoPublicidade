from datetime import date
from unittest.mock import patch

import pytest
from django.core.cache import cache
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.email_connection import cipher
from apps.core.email_templates import preview
from apps.core.models import (
    EmailConnection,
    EmailDraft,
    StaffEmailSignature,
    SupportConversation,
    SupportMessage,
)

BASE = '/api/support-conversations/'


@pytest.fixture(autouse=True)
def approved_staff_signature(staff_user):
    return StaffEmailSignature.objects.create(user=staff_user, display_name='Recepção MP', title='Atendimento', approved=True, approved_by=staff_user)


@pytest.fixture(autouse=True)
def clear_email_workspace_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def email_thread(db):
    conversation = SupportConversation.objects.create(channel='email', contact_email='client@example.com', contact_name='ABC', subject='Pedido de materiais')
    SupportMessage.objects.create(conversation=conversation, source='email', sender=None, email_id='12345:100', body='Precisamos de materiais.', email_subject='Pedido de materiais', email_headers={'from': 'client@example.com', 'to': 'atendimento@maputopublicidade.com'})
    EmailConnection.objects.create(pk=1, oauth_client_id='1000.example', oauth_secret=cipher().encrypt(b'secret').decode(), oauth_refresh=cipher().encrypt(b'refresh').decode(), oauth_account_id='12345', sending_enabled=True)
    return conversation


def save_draft(client, conversation, body='Olá. Confirmamos a receção.', version=0, subject='Resposta MP'):
    return client.patch(f'{BASE}{conversation.pk}/email-draft/', {'subject': subject, 'body': body, 'version': version, 'template_key': 'received'}, format='json')


@pytest.mark.django_db
class TestEmailWorkspace:
    def test_channels_counters_filters_and_work_state_separate_from_read(self, staff_client, email_thread, client_user):
        chat = SupportConversation.objects.create(client=client_user, subject='Chat')
        SupportMessage.objects.create(conversation=chat, sender=client_user, body='Olá')
        summary = staff_client.get(BASE + 'inbox-summary/').data
        assert summary['email'] == 1 and summary['conversations'] == 1
        assert summary['email_unread'] == 1 and summary['conversation_unread'] == 1
        assert summary['stages']['new'] == 1
        assert staff_client.get(BASE, {'channel_group': 'conversations'}).data['results'][0]['id'] == chat.pk
        assert staff_client.get(BASE, {'channel_group': 'email', 'q': 'client@example.com'}).data['count'] == 1
        assert staff_client.get(BASE, {'channel_group': 'email', 'email_stage': 'waiting'}).data['count'] == 0
        staff_client.post(f'{BASE}{email_thread.pk}/read/', {'through_id': email_thread.messages.first().pk})
        summary = staff_client.get(BASE + 'inbox-summary/').data
        assert summary['email_unread'] == 0 and summary['stages']['new'] == 1

    def test_shared_draft_persists_and_rejects_stale_updates(self, staff_client, email_thread, staff_user):
        draft = staff_client.get(f'{BASE}{email_thread.pk}/email-draft/').data
        assert draft['version'] == 0
        response = save_draft(staff_client, email_thread)
        assert response.status_code == 200 and response.data['version'] == 1
        assert response.data['updated_by'] == staff_user.email
        assert save_draft(staff_client, email_thread, body='Overwritten', version=0).status_code == 409
        assert staff_client.get(f'{BASE}{email_thread.pk}/email-draft/').data['body'] == 'Olá. Confirmamos a receção.'
        email_thread.refresh_from_db()
        assert email_thread.email_stage == 'preparing'
        assert 'no-store' in response['Cache-Control']

    def test_reply_subject_stays_within_database_limit(self, staff_client, email_thread):
        conversation_limit = SupportConversation._meta.get_field('subject').max_length
        email_thread.subject = 'A' * conversation_limit
        email_thread.save(update_fields=['subject'])
        response = staff_client.get(f'{BASE}{email_thread.pk}/email-draft/')
        assert response.status_code == 200
        assert response.data['subject'] == 'Re: ' + 'A' * conversation_limit
        draft = EmailDraft.objects.get(conversation=email_thread)
        assert draft.subject == response.data['subject']
        assert len(draft.subject) <= EmailDraft._meta.get_field('subject').max_length

    def test_reply_subject_defensively_truncates_before_draft_insert(self, email_thread):
        from apps.core.email_workspace import get_draft

        # Exercise the defensive boundary without storing an invalid conversation.
        email_thread.subject = 'A' * 255
        draft = get_draft(email_thread)
        draft.refresh_from_db()
        assert draft.subject == 'Re: ' + 'A' * 251

    def test_clients_production_and_non_email_threads_cannot_access_workspace(self, authenticated_client, staff_client, staff_user, email_thread, client_user):
        assert APIClient().get(BASE + 'inbox-summary/').status_code == 401
        assert authenticated_client.get(BASE + 'inbox-summary/').status_code == 403
        assert authenticated_client.get(f'{BASE}{email_thread.pk}/email-draft/').status_code == 404
        chat = SupportConversation.objects.create(client=client_user, subject='Chat')
        assert staff_client.get(f'{BASE}{chat.pk}/email-draft/').status_code == 403
        staff_user.profile.staff_role = StaffRole.PRODUCTION
        staff_user.profile.save(update_fields=['staff_role'])
        assert staff_client.get(f'{BASE}{email_thread.pk}/email-draft/').status_code == 403

    def test_models_use_real_quote_data_and_do_not_send(self, staff_client, email_thread, quote):
        quote.valid_until = date(2026, 11, 1)
        quote.estimated_delivery_days = 5
        quote.save()
        response = staff_client.patch(f'{BASE}{email_thread.pk}/email-context/', {'kind': 'quote', 'reference': quote.reference}, format='json')
        assert response.status_code == 200
        with patch('apps.core.zoho_mail.provider') as provider:
            models = staff_client.get(f'{BASE}{email_thread.pk}/email-models/').data['models']
            assert len(models) == 7
            proposal = next(entry for entry in models if entry['key'] == 'proposal')
            assert quote.reference in proposal['subject']
            assert '01/11/2026' in proposal['body'] and '5 dias úteis' in proposal['body']
            assert '⟦Link' in proposal['body']
            provider.assert_not_called()

    def test_context_never_grants_portal_access(self, staff_client, authenticated_client, email_thread, quote):
        staff_client.patch(f'{BASE}{email_thread.pk}/email-context/', {'kind': 'quote', 'reference': quote.reference}, format='json')
        email_thread.refresh_from_db()
        assert email_thread.client_id is None
        assert authenticated_client.get(f'{BASE}{email_thread.pk}/').status_code == 404
        assert staff_client.patch(f'{BASE}{email_thread.pk}/email-context/', {'kind': 'quote', 'reference': 'NO-EXISTS'}, format='json').status_code == 400

    def test_dynamic_signature_preview_escapes_html_and_links(self, settings):
        settings.COMPANY_PROFILE = {**settings.COMPANY_PROFILE, 'phone': 'new-phone'}
        rendered = preview('<script>Subject</script>', 'Olá <img src=x onerror=alert(1)>\nhttps://example.com/?a=1&b=2')
        assert 'new-phone' in rendered['html']
        assert '<script>Subject</script>' not in rendered['html']
        assert 'onerror=alert(1)>' not in rendered['html']
        assert 'href="https://example.com/?a=1&amp;b=2"' in rendered['html']
        assert rendered['hash'] != preview('different', 'body')['hash']

    def test_incoming_html_retains_paragraphs_but_not_styles_scripts_or_pixels(self):
        from apps.core.email_text import email_text
        result = email_text('<head><style>.hidden{display:none}</style></head><div>Olá</div><p>Outro parágrafo &amp; texto.</p><script>steal()</script><img src="https://tracker.test">')
        assert 'Olá\n\nOutro parágrafo & texto.' == result
        assert 'hidden' not in result and 'steal' not in result and 'tracker' not in result

    def test_placeholder_confirmation_and_stale_preview_guards(self, staff_client, email_thread):
        save_draft(staff_client, email_thread, body='⟦Prazo⟧')
        path = f'{BASE}{email_thread.pk}/'
        rendered = staff_client.post(path + 'email-preview/', {'version': 1}, format='json').data
        with patch('apps.core.zoho_mail.provider') as provider:
            assert staff_client.post(path + 'email-send/', {'version': 1, 'preview_hash': rendered['hash'], 'confirmed': True}, format='json').status_code == 400
            save_draft(staff_client, email_thread, version=1)
            rendered = staff_client.post(path + 'email-preview/', {'version': 2}, format='json').data
            assert staff_client.post(path + 'email-send/', {'version': 2, 'preview_hash': rendered['hash'], 'confirmed': False}, format='json').status_code == 400
            assert staff_client.post(path + 'email-send/', {'version': 2, 'preview_hash': 'wrong', 'confirmed': True}, format='json').status_code == 400
            provider.assert_not_called()

    def test_reviewed_send_is_html_logged_and_clears_shared_draft(self, staff_client, email_thread, staff_user):
        save_draft(staff_client, email_thread)
        path = f'{BASE}{email_thread.pk}/'
        rendered = staff_client.post(path + 'email-preview/', {'version': 1}, format='json').data
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', return_value={'status': {'code': 200}}) as provider:
            result = staff_client.post(path + 'email-send/', {'version': 1, 'preview_hash': rendered['hash'], 'confirmed': True}, format='json')
            assert result.status_code == 200
            assert provider.call_args.kwargs['json']['mailFormat'] == 'html'
            assert provider.call_args.kwargs['json']['subject'] == 'Resposta MP'
            assert result.data['draft']['body'] == ''
            assert staff_client.post(path + 'email-send/', {'version': 1, 'preview_hash': rendered['hash'], 'confirmed': True}, format='json').status_code == 409
            assert provider.call_count == 1
        message = email_thread.messages.filter(is_staff=True).get()
        assert message.sender == staff_user and message.email_subject == 'Resposta MP'
        email_thread.refresh_from_db()
        assert email_thread.email_stage == 'waiting'
        assert staff_client.get(path + 'messages/').data['results'][0]['email_headers']['signature']['email'] == 'atendimento@maputopublicidade.com'

    def test_uncertain_send_preserves_and_locks_draft_until_manual_verification(self, staff_client, email_thread):
        save_draft(staff_client, email_thread)
        path = f'{BASE}{email_thread.pk}/'
        rendered = staff_client.post(path + 'email-preview/', {'version': 1}, format='json').data
        with patch('apps.core.zoho_mail.headers', return_value={}), patch('apps.core.zoho_mail.provider', side_effect=ValidationError('Unconfirmed')) as provider:
            assert staff_client.post(path + 'email-send/', {'version': 1, 'preview_hash': rendered['hash'], 'confirmed': True}, format='json').status_code == 400
            assert staff_client.post(path + 'email-send/', {'version': 1, 'preview_hash': rendered['hash'], 'confirmed': True}, format='json').status_code == 409
            assert provider.call_count == 1
        assert EmailDraft.objects.get(conversation=email_thread).body
        assert save_draft(staff_client, email_thread, version=1).status_code == 409
        assert staff_client.post(path + 'email-recover/', {'version': 1, 'outcome': 'not_sent', 'confirmed': False}, format='json').status_code == 400
        assert staff_client.post(path + 'email-recover/', {'version': 1, 'outcome': 'not_sent', 'confirmed': True}, format='json').status_code == 200
        draft = EmailDraft.objects.get(conversation=email_thread)
        assert draft.send_state == 'idle' and draft.body
        assert email_thread.messages.filter(is_staff=True).get().email_headers['verified_by']
