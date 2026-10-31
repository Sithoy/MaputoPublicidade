from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.quotes.client_proposal import review_link, validate_proposal_email
from apps.quotes.test_client_proposal import sent_proposal as sent_proposal

from .models import ActivityEvent, EmailDraft, PortalNotification, SupportFile
from .production_views import share_token
from .review_sharing import validate_artwork_links
from .test_production import publish, upload


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()


@pytest.fixture
def art_version(order, staff_client):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.save()
    quote.items.update(needs_design=True)
    assert upload(staff_client, quote).status_code == 201
    version = quote.proof_versions.first()
    assert publish(staff_client, quote, version).status_code == 200
    version.refresh_from_db()
    return version


def proposal_guest(token):
    api = APIClient()
    api.credentials(HTTP_X_MP_PROPOSAL_TOKEN=token)
    return api


@pytest.mark.django_db
def test_proposal_message_is_small_current_and_rejects_expired_conditions(staff_client, sent_proposal):
    quote = sent_proposal
    url = f'/api/quotes/{quote.reference}/client-workspace/'
    data = {'action': 'prepare_share', 'version': quote.proposal_version}
    result = staff_client.post(url, data, format='json')
    assert result.status_code == 200, result.data
    message = result.data['message']
    assert quote.reference in message and '*Trabalho:* 2 × Cartão de Visita' in message
    assert '*Versão:* 1' in message and '*Link válido até:*' in message
    assert 'PRIVATE-STAFF-ONLY' not in message and message.count('https://') == 1
    assert 'anexo' not in message
    assert staff_client.post(url, {**data, 'version': 2}, format='json').status_code == 400
    quote.valid_until = timezone.localdate() - timedelta(days=1)
    quote.save()
    assert staff_client.post(url, data, format='json').status_code == 400
    assert staff_client.post(url, {**data, 'action': 'email'}, format='json').status_code == 400


@pytest.mark.django_db
def test_expired_proposal_only_requests_renewal_never_reopens_access(sent_proposal, staff_user, mailoutbox):
    quote = sent_proposal
    with patch('apps.quotes.client_proposal.time.time', return_value=timezone.now().timestamp() - 8 * 86400):
        token = review_link(quote).split('#token=')[1]
    api = proposal_guest(token)
    url = '/api/proposal-review/'
    expired = api.post(url, {'action': 'view'}, format='json')
    assert expired.status_code == 410
    assert expired.data['code'] == 'link_expired'
    assert not {'items', 'client_name', 'reference', 'link'} & expired.data.keys()
    for _ in range(2):
        assert api.post(url, {'action': 'request_link'}, format='json').status_code == 200
    assert ActivityEvent.objects.filter(quote=quote, comment__startswith='Pedido de novo link:').count() == 1
    assert PortalNotification.objects.filter(recipient=staff_user, title__contains='pedido de novo link').count() == 1
    quote.refresh_from_db()
    assert not quote.price_approved_at and not hasattr(quote, 'order')
    assert api.post(url, {'action': 'view'}, format='json').status_code == 410
    assert not mailoutbox
    tampered = proposal_guest(token + 'bad')
    assert tampered.post(url, {'action': 'request_link'}, format='json').status_code == 403
    quote.items.update(quantity=300)
    assert api.post(url, {'action': 'request_link'}, format='json').status_code == 403


@pytest.mark.django_db
def test_art_share_detects_expiry_and_only_staff_can_renew(staff_client, authenticated_client, art_version, staff_user, mailoutbox):
    version = art_version
    old_token = share_token(version)
    version.share_expires_at = timezone.now() - timedelta(hours=1)
    version.save()
    public = APIClient()
    review = f'/api/art-review/{old_token}/'
    share = f'/api/production/{version.quote.reference}/share/{version.pk}/'
    expired = public.get(review)
    assert expired.status_code == 410 and expired.data['code'] == 'link_expired'
    assert public.get(review + 'file/').status_code == 404
    for _ in range(2):
        assert public.post(review, {'action': 'request_link'}, format='json').status_code == 200
    assert PortalNotification.objects.filter(recipient=staff_user, title__contains='pedido de novo link').count() == 1
    version.refresh_from_db()
    assert version.client_decision == 'pending' and version.share_expires_at < timezone.now()
    assert staff_client.post(share, {}, format='json').data['expired']
    assert authenticated_client.post(share, {'renew': True}, format='json').status_code == 403
    fresh = staff_client.post(share, {'renew': True}, format='json')
    assert fresh.status_code == 200 and not fresh.data['expired']
    assert '*Arte para aprovação' in fresh.data['message'] and '*Trabalho:*' in fresh.data['message']
    assert public.get(review).status_code == 404
    assert public.post(review, {'action': 'request_link'}, format='json').status_code == 404
    token = fresh.data['link'].rsplit('/', 1)[-1]
    assert public.get(f'/api/art-review/{token}/').status_code == 200
    assert not mailoutbox


@pytest.mark.django_db
def test_draft_or_superseded_art_cannot_be_shared_or_renewed(staff_client, art_version):
    version = art_version
    token = share_token(version)
    assert upload(staff_client, version.quote).status_code == 201
    old = f'/api/production/{version.quote.reference}/share/{version.pk}/'
    assert staff_client.post(old, {'renew': True}, format='json').status_code == 400
    assert APIClient().post(f'/api/art-review/{token}/', {'action': 'request_link'}, format='json').status_code == 400
    draft = version.quote.proof_versions.order_by('-version').first()
    assert staff_client.post(f'/api/production/{version.quote.reference}/share/{draft.pk}/', {}, format='json').status_code == 400


@pytest.mark.django_db
def test_artwork_email_body_rechecks_expiry_and_order_scope(art_version):
    from rest_framework.exceptions import ValidationError

    body = f'Reveja: https://maputopublicidade.com/arte/rever/{share_token(art_version)}'
    validate_artwork_links(body, art_version.quote_id)
    with pytest.raises(ValidationError):
        validate_artwork_links(body, art_version.quote_id + 1)
    art_version.share_expires_at = timezone.now() - timedelta(seconds=1)
    art_version.save()
    with pytest.raises(ValidationError, match='link de arte no email expirou'):
        validate_artwork_links(body, art_version.quote_id)


@pytest.mark.django_db
def test_email_send_validation_rejects_an_expired_link_even_if_pdf_is_current(staff_client, sent_proposal):
    result = staff_client.post(f'/api/quotes/{sent_proposal.reference}/client-workspace/', {'action': 'email', 'version': 1}, format='json')
    draft = EmailDraft.objects.select_related('conversation').get(conversation_id=result.data['conversation_id'])
    files = list(SupportFile.objects.filter(pk__in=draft.attachment_ids))
    with patch('apps.quotes.client_proposal.time.time', return_value=timezone.now().timestamp() - 8 * 86400):
        old_link = review_link(sent_proposal)
    from rest_framework.exceptions import ValidationError
    with pytest.raises(ValidationError, match='link no email expirou'):
        validate_proposal_email(draft.conversation, files, f'Reveja aqui: {old_link}')
