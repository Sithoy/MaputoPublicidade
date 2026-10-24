
import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.orders.models import Order
from apps.quotes.models import QuoteItem

from .models import EmailDraft, PortalNotification
from .studio import readiness
from .support_files import selected_files
from .test_production import assert_no_finance, publish, upload
from .test_production import production_api as production_api


@pytest.fixture(autouse=True)
def isolated_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def studio_order(order):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.proposal_stage = 'sent'
    quote.proposal_version = 1
    quote.proposal_sent_at = timezone.now()
    quote.save()
    quote.items.update(needs_design=True)
    return order


@pytest.mark.django_db
def test_no_proof_cannot_bypass_studio_on_any_status_route(studio_order, production_api, staff_client):
    quote = studio_order.quote
    for method, path in [('post', f'/api/orders/{studio_order.reference}/set-status/'), ('patch', f'/api/orders/{studio_order.reference}/'), ('post', f'/api/quotes/{quote.reference}/set-status/')]:
        response = getattr(staff_client, method)(path, {'status': 'in_production'}, format='json')
        assert response.status_code == 400, response.data
    data = production_api.get(f'/api/production/{quote.reference}/').data
    assert data['operation']['stage'] == 'studio'
    assert not data['operation']['can_start']
    assert_no_finance(data)


@pytest.mark.django_db
def test_no_art_job_is_ready_without_studio(studio_order, production_api):
    studio_order.quote.items.update(needs_design=False)
    data = production_api.get(f'/api/production/{studio_order.quote.reference}/').data
    assert data['operation']['can_start']
    response = production_api.post(f'/api/orders/{studio_order.reference}/set-status/', {'status': 'in_production'}, format='json')
    assert response.status_code == 200


@pytest.mark.django_db
def test_whole_mixed_order_waits_for_art_and_approval_does_not_start_manufacture(studio_order, production_api):
    quote = studio_order.quote
    QuoteItem.objects.create(quote=quote, description='Artigo sem arte', quantity=10)
    assert upload(production_api, quote).status_code == 201
    version = quote.proof_versions.first()
    response = publish(production_api, quote, version)
    assert response.status_code == 200
    assert response.data['job']['operation']['stage'] == 'client_art'
    token = response.data['review_path'].rsplit('/', 1)[-1]
    api = APIClient()
    assert api.post(f'/api/art-review/{token}/', {'decision': 'approved', 'name': 'Director'}, format='json').status_code == 200
    studio_order.refresh_from_db()
    assert studio_order.status == Order.STATUS_APPROVED
    quote.refresh_from_db()
    assert readiness(quote)['can_start']
    assert production_api.post(f'/api/orders/{studio_order.reference}/set-status/', {'status': 'in_production'}, format='json').status_code == 200
    assert upload(production_api, quote).status_code == 400


@pytest.mark.django_db
def test_new_draft_invalidates_old_approval_before_it_is_published(studio_order, production_api, authenticated_client):
    quote = studio_order.quote
    upload(production_api, quote)
    version = quote.proof_versions.first()
    token = publish(production_api, quote, version).data['review_path'].rsplit('/', 1)[-1]
    assert authenticated_client.post(f'/api/quotes/{quote.reference}/approve/', {'version_id': version.pk}, format='json').status_code == 200
    assert upload(production_api, quote).status_code == 201
    assert production_api.post(f'/api/orders/{studio_order.reference}/set-status/', {'status': 'in_production'}, format='json').status_code == 400
    assert authenticated_client.post(f'/api/quotes/{quote.reference}/approve/', {'version_id': version.pk}, format='json').status_code == 400
    assert not APIClient().get(f'/api/art-review/{token}/').data['current']


@pytest.mark.django_db
def test_requirements_and_phone_decisions_are_versioned_and_audited(studio_order, production_api):
    quote = studio_order.quote
    item = quote.items.first()
    url = f'/api/production/{quote.reference}/requirements/'
    assert production_api.post(url, {'items': [{'item_id': item.pk, 'requirement': 'client'}]}, format='json').status_code == 400
    response = production_api.post(url, {'note': 'Verificar ficheiro entregue pelo cliente', 'items': [{'item_id': item.pk, 'requirement': 'client'}]}, format='json')
    assert response.status_code == 200
    assert response.data['artwork_routes'][0]['requirement'] == 'client'
    upload(production_api, quote)
    version = quote.proof_versions.first()
    publish(production_api, quote, version)
    values = {'version_id': version.pk, 'decision': 'approved', 'contact_name': 'Director', 'comment': 'Confirmou cores e medidas por telefone', 'confirmed': True}
    url = f'/api/production/{quote.reference}/decision/'
    assert production_api.post(url, {**values, 'confirmed': False}, format='json').status_code == 400
    response = production_api.post(url, values, format='json')
    assert response.status_code == 200
    assert response.data['operation']['can_start']
    assert quote.activity_events.filter(action='artwork_approved', actor=production_api.handler._force_user).exists()
    assert production_api.post(url, values, format='json').status_code == 400


@pytest.mark.django_db
def test_artwork_email_is_prepared_for_reception_not_sent_and_stale_files_are_rejected(studio_order, production_api, mailoutbox):
    quote = studio_order.quote
    upload(production_api, quote)
    version = quote.proof_versions.first()
    publish(production_api, quote, version)
    url = f'/api/production/{quote.reference}/email/{version.pk}/'
    result = production_api.post(url)
    assert result.status_code == 200, result.data
    draft = EmailDraft.objects.get(conversation_id=result.data['conversation_id'])
    assert '/arte/rever/' in draft.body and draft.template_key == 'artwork'
    assert len(selected_files(draft.conversation, draft.attachment_ids)) == 1
    draft.body = 'Texto revisto pela Recepção'
    draft.save()
    production_api.post(url)
    draft.refresh_from_db()
    assert draft.body == 'Texto revisto pela Recepção'
    assert not mailoutbox
    upload(production_api, quote)
    with pytest.raises(ValidationError):
        selected_files(draft.conversation, draft.attachment_ids)


@pytest.mark.django_db
def test_reception_is_notified_even_when_staff_records_client_acceptance(quote, staff_client):
    receptionist = User.objects.create_user('shared-reception-notice', is_staff=True)
    receptionist.profile.staff_role = StaffRole.RECEPTIONIST
    receptionist.profile.save()
    quote.proposal_stage, quote.proposal_version, quote.proposal_sent_at = 'sent', 1, timezone.now()
    quote.final_price, quote.status = 100, 'quoted'
    quote.save()
    quote.items.update(needs_design=True)
    result = staff_client.post(f'/api/quotes/{quote.reference}/client-workspace/', {'action': 'phone', 'decision': 'accept', 'version': 1, 'contact_name': 'Director', 'comment': 'Confirmado por telefone', 'confirmed': True}, format='json')
    assert result.status_code == 200
    assert PortalNotification.objects.filter(recipient=receptionist, title__contains='cliente aprovou').exists()
