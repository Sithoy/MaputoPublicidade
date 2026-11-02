import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.orders.models import Order
from apps.quotes.models import ArtworkProofVersion, QuoteItem, QuoteRequest

from .studio import technical_fingerprint
from .test_production import assert_no_finance


@pytest.fixture
def production_api(db):
    user = User.objects.create_user('operations-staff', is_staff=True)
    user.profile.staff_role = StaffRole.PRODUCTION
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    return api


@pytest.mark.django_db
def test_operations_same_job_moves_from_art_to_production(production_api, order):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.save()
    quote.items.update(needs_design=True)
    url = '/api/production/operations/'
    data = production_api.get(url).data
    assert data['overview']['new'] == 1
    assert_no_finance(data)
    proof = ArtworkProofVersion.objects.create(quote=quote, version=1, file_name='art.pdf',
        technical_fingerprint=technical_fingerprint(quote), published_at=timezone.now(), client_decision='pending')
    assert production_api.get(url).data['overview']['approval'] == 1
    proof.client_decision = 'approved'
    proof.save()
    assert production_api.get(url).data['overview']['ready'] == 1
    quote.items.update(quantity=333)
    assert production_api.get(url).data['overview']['ready'] == 0
    # A current approval is mandatory; a changed job cannot start.
    start = f'/api/orders/{order.reference}/set-status/'
    assert production_api.post(start, {'status': 'in_production'}, format='json').status_code == 400
    proof.technical_fingerprint = technical_fingerprint(quote)
    proof.save()
    assert production_api.post(start, {'status': 'in_production'}, format='json').status_code == 200
    assert production_api.get(url).data['overview']['production'] == 1
    assert production_api.post(start, {'status': 'ready'}, format='json').status_code == 200
    assert production_api.get(url).data['overview']['delivery'] == 1


@pytest.mark.django_db
def test_operations_direct_production_and_missing_details(production_api, order):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.save()
    quote.items.update(needs_design=False)
    url = '/api/production/operations/'
    assert production_api.get(url).data['overview']['ready'] == 1
    quote.items.all().delete()
    data = production_api.get(url).data
    assert data['overview']['preparation'] == 1
    assert data['results'][0]['missing']
    assert production_api.post(f'/api/orders/{order.reference}/set-status/', {'status': 'in_production'}, format='json').status_code == 400
    detail = production_api.get(f'/api/production/{quote.reference}/').data
    assert detail['operation']['can_start'] is False
    assert_no_finance(detail)


@pytest.mark.django_db
def test_operations_pagination_search_and_permissions(production_api, authenticated_client):
    for number in range(12):
        quote = QuoteRequest.objects.create(client_name=f'Operations {number}', status='approved', price_approved_at=timezone.now())
        QuoteItem.objects.create(quote=quote, description='Polo', quantity=200)
        Order.objects.create(quote=quote, status='approved', final_price='100')
    url = '/api/production/operations/'
    first = production_api.get(url)
    assert first['Cache-Control'] == 'private, no-store'
    assert first.data['count'] == first.data['overview']['all'] == 12
    assert len(first.data['results']) == 10
    assert len(production_api.get(url + '?page=2').data['results']) == 2
    assert production_api.get(url + '?search=Operations+11').data['count'] == 1
    assert production_api.get(url + '?task=invalid').status_code == 400
    assert APIClient().get(url).status_code in {401, 403}
    assert authenticated_client.get(url).status_code == 403
    user = User.objects.create_user('operations-finance', is_staff=True)
    user.profile.staff_role = StaffRole.FINANCE
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    assert api.get(url).status_code == 403
