from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core import signing
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import EmailDraft, SupportConversation, SupportFile
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
