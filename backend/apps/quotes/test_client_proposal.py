from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core import signing
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import (
    EmailConnection,
    EmailDraft,
    StaffEmailSignature,
    SupportConversation,
    SupportFile,
    SupportMessage,
)
from apps.orders.models import Order

from .client_proposal import MAX_AGE, SALT, review_link


@pytest.fixture
def sent_proposal(quote):
    quote.proposal_stage = 'sent'
    quote.proposal_version = 1
    quote.proposal_sent_at = timezone.now()
    quote.status = 'quoted'
    quote.final_price = Decimal('232')
    quote.commercial_pricing = True
    quote.valid_until = timezone.localdate() + timedelta(days=10)
    quote.notes = 'Public observations'
    quote.internal_notes = 'PRIVATE-STAFF-ONLY'
    quote.save()
    quote.items.update(unit_price=100)
    return quote


def guest(quote):
    client = APIClient()
    client.credentials(HTTP_X_MP_PROPOSAL_TOKEN=review_link(quote).split('#token=')[1])
    return client


def respond(client, **values):
    return client.post('/api/proposal-review/', {'action': 'accept', 'version': 1,
        'contact_name': 'Cliente autorizado', 'comment': '', 'confirmed': True, **values}, format='json')


@pytest.mark.django_db
class TestClientProposal:
    @pytest.mark.parametrize('action', ['accept', 'changes', 'decline'])
    def test_branddesk_decision_uses_current_snapshot_and_shared_audit(self, sent_proposal, authenticated_client, action):
        url = f'/api/quotes/{sent_proposal.reference}/client-review/'
        current = authenticated_client.get(url)
        assert current.status_code == 200
        assert 'snapshot' in current.data
        result = authenticated_client.post(url, {'action': action, 'version': 1,
            'snapshot': current.data['snapshot'], 'contact_name': 'Director', 'confirmed': True,
            'comment': 'Condições revistas'}, format='json')
        assert result.status_code == 200, result.data
        sent_proposal.refresh_from_db()
        assert result.data['decision']['channel'] == 'branddesk'
        assert sent_proposal.proposal_history[-1]['actor_id'] == sent_proposal.user_id
        assert not Order.objects.filter(quote=sent_proposal).exists()
        assert authenticated_client.post(url, {'action': action, 'version': 1,
            'snapshot': current.data['snapshot'], 'contact_name': 'Director', 'confirmed': True,
            'comment': 'Repetição'}, format='json').status_code == 400

    def test_branddesk_rejects_stale_snapshot_and_legacy_approval_bypass(self, sent_proposal, authenticated_client, staff_client):
        url = f'/api/quotes/{sent_proposal.reference}/client-review/'
        current = authenticated_client.get(url).data
        sent_proposal.items.update(unit_price=200)
        result = authenticated_client.post(url, {'action': 'accept', 'version': 1,
            'snapshot': current['snapshot'], 'contact_name': 'Director', 'confirmed': True}, format='json')
        assert result.status_code == 400
        assert staff_client.get(url).status_code == 403
        assert authenticated_client.post(f'/api/quotes/{sent_proposal.reference}/approve-price/').status_code == 400
        sent_proposal.refresh_from_db()
        assert not sent_proposal.price_approved_at

    def test_availability_and_draft_are_not_mistaken_for_actual_delivery(self, sent_proposal, staff_client):
        sent_proposal.user = None
        sent_proposal.save()
        url = f'/api/quotes/{sent_proposal.reference}/client-workspace/'
        initial = staff_client.get(url).data
        assert initial['state'] == 'not_sent'
        prepared = staff_client.post(url, {'action': 'email', 'version': 1}, format='json')
        assert prepared.status_code == 200
        current = staff_client.get(url).data
        assert current['state'] == 'not_sent'
        assert current['channels']['email']['state'] == 'draft'
        SupportMessage.objects.create(conversation_id=prepared.data['conversation_id'], source='email', is_staff=True,
                                      delivery_status='accepted', body='Synthetic provider acknowledgement')
        assert staff_client.get(url).data['state'] == 'awaiting_response'

    def test_confirmed_whatsapp_and_followup_are_logged_without_sending(self, sent_proposal, staff_client, staff_user, mailoutbox):
        sent_proposal.client_phone = '841234567'
        sent_proposal.save()
        url = f'/api/quotes/{sent_proposal.reference}/client-workspace/'
        assert staff_client.get(url).data['whatsapp_number'] == '258841234567'
        assert staff_client.post(url, {'action': 'whatsapp', 'version': 1}, format='json').status_code == 400
        result = staff_client.post(url, {'action': 'whatsapp', 'version': 1, 'confirmed': True,
                                        'comment': 'PDF e link enviados ao contacto confirmado'}, format='json')
        assert result.status_code == 200, result.data
        assert result.data['channels']['whatsapp']['state'] == 'confirmed'
        sent_proposal.refresh_from_db()
        assert sent_proposal.proposal_history[-1]['actor_id'] == staff_user.pk
        next_date = str(timezone.localdate() + timedelta(days=1))
        response = staff_client.post(url, {'action': 'follow_up', 'version': 1, 'date': next_date,
                                          'comment': 'Confirmar decisão com compras'}, format='json')
        assert response.status_code == 200, response.data
        assert str(response.data['follow_up']['date']) == next_date
        assert not mailoutbox
        assert not Order.objects.filter(quote=sent_proposal).exists()
        sent_proposal.valid_until = timezone.localdate() - timedelta(days=1)
        sent_proposal.save(update_fields=['valid_until'])
        assert staff_client.post(url, {'action': 'whatsapp', 'version': 1, 'confirmed': True,
                                      'comment': 'Tentativa depois de expirar'}, format='json').status_code == 400

    @pytest.mark.parametrize('stale', [False, True])
    def test_first_outbound_email_can_send_with_signature_but_stale_pdf_cannot(self, sent_proposal, staff_client, staff_user, authenticated_client, stale):
        StaffEmailSignature.objects.create(user=staff_user, display_name='Recepção MP', title='Atendimento', approved=True)
        EmailConnection.objects.create(pk=1, oauth_account_id='12345', sending_enabled=True)
        prepared = staff_client.post(f'/api/quotes/{sent_proposal.reference}/client-workspace/',
                                    {'action': 'email', 'version': 1}, format='json')
        base = f'/api/support-conversations/{prepared.data["conversation_id"]}/'
        draft = EmailDraft.objects.get(conversation_id=prepared.data['conversation_id'])
        preview = staff_client.post(base + 'email-preview/', {'version': draft.version}, format='json')
        assert preview.status_code == 200, preview.data
        assert not SupportMessage.objects.filter(conversation_id=draft.conversation_id).exists()
        if stale:
            sent_proposal.items.update(unit_price=999)
        with patch('apps.core.zoho_mail.send') as transport:
            result = staff_client.post(base + 'email-send/', {'version': draft.version, 'confirmed': True,
                'preview_hash': preview.data['hash']}, format='json')
        if stale:
            assert result.status_code == 400, result.data
            transport.assert_not_called()
            draft.refresh_from_db()
            assert draft.send_state == 'idle'
        else:
            assert result.status_code == 200, result.data
            assert transport.call_args.kwargs['reply_id'] is None
            assert transport.call_args.kwargs['files']
            message = SupportMessage.objects.get(conversation_id=draft.conversation_id)
            assert message.delivery_status == 'accepted'
            assert message.sender == staff_user
            assert message.email_headers['signature']['staff_name'] == 'Recepção MP'
            summary = staff_client.get(f'/api/quotes/{sent_proposal.reference}/client-workspace/').data
            assert summary['channels']['email']['state'] == 'accepted'
            review_url = f'/api/quotes/{sent_proposal.reference}/client-review/'
            reviewed = authenticated_client.get(review_url).data
            accepted = authenticated_client.post(review_url, {'action': 'accept', 'version': reviewed['version'],
                'snapshot': reviewed['snapshot'], 'contact_name': 'Director', 'confirmed': True}, format='json')
            assert accepted.status_code == 200, accepted.data
            after = staff_client.get(f'/api/quotes/{sent_proposal.reference}/client-workspace/').data
            assert after['state'] == 'accepted'
            assert after['decision']['channel'] == 'branddesk'
            assert not Order.objects.filter(quote=sent_proposal).exists()

    def test_branddesk_review_is_owner_only(self, sent_proposal, authenticated_client):
        url = f'/api/quotes/{sent_proposal.reference}/client-review/'
        assert APIClient().get(url).status_code in {401, 403}
        sent_proposal.user = None
        sent_proposal.save()
        assert authenticated_client.get(url).status_code in {403, 404}

    def test_private_projection_and_pdf(self, sent_proposal):
        client = guest(sent_proposal)
        response = respond(client, action='view')
        assert response.status_code == 200
        assert response.data['reference'] == sent_proposal.reference
        assert 'PRIVATE-STAFF-ONLY' not in str(response.data)
        assert not {'client_email', 'proposal_history', 'vat_exemption_reason', 'user'} & response.data.keys()
        assert response['Cache-Control'] == 'private, no-store'
        pdf = respond(client, action='pdf')
        assert pdf.status_code == 200
        assert pdf.content.startswith(b'%PDF-')
        assert client.get('/api/proposal-review/').status_code == 405

    @pytest.mark.parametrize('action', ['accept', 'changes', 'decline'])
    def test_decisions_are_single_and_never_create_production(self, sent_proposal, action):
        client = guest(sent_proposal)
        result = respond(client, action=action, comment='Contexto confirmado')
        assert result.status_code == 200, result.data
        sent_proposal.refresh_from_db()
        assert bool(sent_proposal.price_approved_at) == (action == 'accept')
        assert sent_proposal.proposal_history[-1]['client_decision'] == action
        assert sent_proposal.proposal_history[-1]['actor_id'] is None
        assert not Order.objects.filter(quote=sent_proposal).exists()
        assert respond(client).status_code == 400
        assert respond(client, action='view').data['decision']['client_decision'] == action

    def test_links_are_invalidated_by_edits_and_other_proposals_cannot_be_selected(self, sent_proposal, quote):
        client = guest(sent_proposal)
        assert respond(client, action='view', quote_id=999).data['reference'] == sent_proposal.reference
        sent_proposal.items.update(size='new size')
        assert respond(client, action='view').status_code == 403
        no_token = APIClient()
        assert respond(no_token).status_code == 403

    def test_drafts_expiry_and_tampering(self, sent_proposal):
        client = guest(sent_proposal)
        with patch('django.core.signing.time.time', return_value=timezone.now().timestamp() + MAX_AGE + 10):
            assert respond(client, action='view').status_code == 403
        client.credentials(HTTP_X_MP_PROPOSAL_TOKEN=signing.dumps({'q': sent_proposal.pk, 'v': 1, 'f': 'bad'}, salt=SALT))
        assert respond(client).status_code == 403
        client = guest(sent_proposal)
        sent_proposal.proposal_stage = 'draft'
        sent_proposal.save()
        assert respond(client).status_code == 403

    def test_expired_offer_readable_but_no_decision(self, sent_proposal):
        sent_proposal.valid_until = timezone.localdate() - timedelta(days=1)
        sent_proposal.save()
        client = guest(sent_proposal)
        assert respond(client, action='view').data['expired']
        assert respond(client).status_code == 400

    def test_confirmation_version_and_reason_required(self, sent_proposal):
        client = guest(sent_proposal)
        for values in [{'confirmed': False}, {'version': 2}, {'action': 'decline'}, {'action': 'changes'}]:
            assert respond(client, **values).status_code == 400
        sent_proposal.refresh_from_db()
        assert sent_proposal.proposal_history == []

    def test_phone_records_staff_and_requires_context(self, sent_proposal, staff_client, staff_user):
        client = guest(sent_proposal)
        url = f'/api/quotes/{sent_proposal.reference}/client-workspace/'
        payload = {'action': 'phone', 'decision': 'accept', 'version': 1,
                   'contact_name': 'Director', 'comment': 'Ligação recebida às 10h', 'confirmed': True}
        assert staff_client.post(url, {**payload, 'comment': ''}, format='json').status_code == 400
        result = staff_client.post(url, payload, format='json')
        assert result.status_code == 200, result.data
        sent_proposal.refresh_from_db()
        assert sent_proposal.price_approved_by == staff_user
        assert sent_proposal.proposal_history[-1]['channel'] == 'phone'
        public = respond(client, action='view')
        assert public.status_code == 200
        assert 'Ligação recebida' not in str(public.data)
        assert 'comment' not in public.data['decision']
        assert not Order.objects.filter(quote=sent_proposal).exists()

    def test_email_draft_has_pdf_preserves_edits_and_does_not_send(self, sent_proposal, staff_client, mailoutbox):
        url = f'/api/quotes/{sent_proposal.reference}/client-workspace/'
        payload = {'action': 'email', 'version': 1}
        result = staff_client.post(url, payload, format='json')
        assert result.status_code == 200, result.data
        draft = EmailDraft.objects.get(conversation_id=result.data['conversation_id'])
        file = SupportFile.objects.get(pk=draft.attachment_ids[0])
        assert bytes(file.content).startswith(b'%PDF-')
        assert '/proposta#token=' in draft.body
        draft.body = 'Colleague draft'
        draft.save()
        assert staff_client.post(url, payload, format='json').status_code == 200
        draft.refresh_from_db()
        assert draft.body == 'Colleague draft'
        assert len(mailoutbox) == 0

    def test_customer_and_production_cannot_mint_staff_links(self, sent_proposal, authenticated_client, staff_client, staff_user):
        url = f'/api/quotes/{sent_proposal.reference}/client-workspace/'
        assert authenticated_client.get(url).status_code == 403
        staff_user.profile.staff_role = StaffRole.PRODUCTION
        staff_user.profile.save()
        assert staff_client.get(url).status_code == 403

    def test_question_arrives_in_linked_inbox_without_approving(self, sent_proposal):
        result = respond(guest(sent_proposal), action='question', body='Podemos alterar a cor?')
        assert result.status_code == 200
        conversation = SupportConversation.objects.get(quote=sent_proposal)
        assert 'alterar a cor' in conversation.messages.get().body
        sent_proposal.refresh_from_db()
        assert not sent_proposal.price_approved_at

    def test_publish_notifies_branddesk_without_sending_a_legacy_email(self, sent_proposal, staff_client, mailoutbox):
        from apps.core.models import PortalNotification

        sent_proposal.proposal_stage = 'approved'
        sent_proposal.proposal_sent_at = None
        sent_proposal.status = 'reviewing'
        sent_proposal.save()
        result = staff_client.post(f'/api/quotes/{sent_proposal.reference}/client-workspace/',
                                  {'action': 'publish', 'version': 1}, format='json')
        assert result.status_code == 200, result.data
        sent_proposal.refresh_from_db()
        assert sent_proposal.proposal_stage == 'sent'
        assert PortalNotification.objects.filter(recipient=sent_proposal.user, title__contains='proposta v1').exists()
        assert len(mailoutbox) == 0
