import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.orders.models import Order
from apps.quotes.models import ArtworkProofVersion, QuoteItem, QuoteRequest

from .job_workflow import job_journey
from .studio import technical_fingerprint
from .test_production import assert_no_finance


@pytest.mark.django_db
def test_reception_and_client_share_art_and_delivery_journey(staff_client, authenticated_client, order):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.internal_notes = 'Private cost and staff discussion'
    quote.save()
    quote.items.update(needs_design=True)
    def parity(key):
        admin = staff_client.get(f'/api/quotes/{quote.reference}/').data['journey']
        client = authenticated_client.get(f'/api/quotes/{quote.reference}/').data['journey']
        project = authenticated_client.get(f'/api/orders/{order.reference}/').data['journey']
        assert admin == client == project
        assert admin['key'] == key
        assert 'Private cost' not in str(client)
        assert_no_finance(admin)
        return admin
    parity('art')
    proof = ArtworkProofVersion.objects.create(quote=quote, version=1, file_name='art.pdf',
        published_at=timezone.now(), technical_fingerprint=technical_fingerprint(quote))
    parity('art_client')
    proof.client_decision = 'changes_requested'
    proof.save()
    parity('art')
    proof.client_decision = 'approved'
    proof.save()
    parity('production')
    quote.items.update(quantity=123)
    parity('art')  # a changed job cannot reuse an old approval
    order.status = 'in_production'
    order.save()
    parity('production')
    order.status = 'ready'
    order.save()
    parity('delivery')
    order.status = 'delivered'
    order.save()
    parity('delivered')


@pytest.mark.django_db
def test_proposal_and_no_art_paths(quote, order):
    # quote fixture now has the order; remove it to test pre-acceptance.
    order.delete()
    quote.refresh_from_db()
    assert job_journey(quote)['key'] == 'briefing'
    quote.reception_completed_at = timezone.now()
    assert job_journey(quote)['key'] == 'proposal'
    quote.proposal_stage = 'approved'
    assert job_journey(quote)['key'] == 'proposal'  # saved is not sent
    quote.proposal_stage = 'sent'
    assert job_journey(quote)['key'] == 'client'
    quote.price_approved_at = timezone.now()
    quote.save()
    new_order = Order.objects.create(quote=quote, status='approved')
    quote.refresh_from_db()
    journey = job_journey(quote)
    assert journey['key'] == 'production'
    assert all(journey['steps'][i]['skipped'] for i in (3, 4))
    new_order.status = 'cancelled'
    new_order.save()
    assert job_journey(quote, new_order)['cancelled'] is True


@pytest.mark.django_db
def test_board_deduplicates_and_keeps_finance_private(staff_client, authenticated_client, order):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.save()
    data = staff_client.get('/api/workflow/board/').data
    assert data['count'] == 1
    assert data['results'][0]['reference'] == quote.reference
    assert data['counts']['production'] == 1
    assert_no_finance(data)
    assert staff_client.get('/api/workflow/board/?stage=unknown').status_code == 400
    assert staff_client.get('/api/workflow/board/?column=unknown').status_code == 400
    assert staff_client.get('/api/workflow/board/?page=bad').status_code == 400
    assert authenticated_client.get('/api/workflow/board/').status_code == 403
    assert APIClient().get('/api/workflow/board/').status_code in (401, 403)
    user = User.objects.create_user('board-production', is_staff=True)
    user.profile.staff_role = StaffRole.PRODUCTION
    user.profile.save()
    production = APIClient()
    production.force_authenticate(user)
    QuoteRequest.objects.create(client_name='Pre-commercial private request')
    data = production.get('/api/workflow/board/').data
    assert data['count'] == 1
    assert 'Pre-commercial' not in str(data)
    assert_no_finance(data)
    assert production.get('/api/quotes/').status_code == 403


@pytest.mark.django_db
def test_board_counts_are_not_limited_to_first_page_and_standalone_orders_survive(staff_client):
    for index in range(82):
        quote = QuoteRequest.objects.create(client_name=f'Empresa {index}')
        QuoteItem.objects.create(quote=quote, description='Polo', quantity=10)
    standalone = Order.objects.create(status='in_production')
    first = staff_client.get('/api/workflow/board/')
    assert first['Cache-Control'] == 'private, no-store'
    assert first.data['count'] == 83
    assert len(first.data['results']) == 80
    second = staff_client.get('/api/workflow/board/?page=2').data
    assert len(second['results']) == 3
    assert not {row['reference'] for row in first.data['results']} & {row['reference'] for row in second['results']}
    assert staff_client.get('/api/workflow/board/?search=Empresa+81').data['count'] == 1
    data = staff_client.get('/api/workflow/board/?stage=production').data
    assert data['results'][0]['order_reference'] == standalone.reference


@pytest.mark.django_db
def test_board_groups_detailed_stages_before_pagination_and_keeps_history_separate(staff_client):
    QuoteRequest.objects.create(client_name='Briefing')
    QuoteRequest.objects.create(client_name='Preparação', reception_completed_at=timezone.now())
    QuoteRequest.objects.create(client_name='Decisão', proposal_stage='sent')
    Order.objects.create(status='ready', delivery_method='delivery')
    Order.objects.create(status='delivered')
    active = staff_client.get('/api/workflow/board/?column=active').data
    assert active['count'] == 4
    assert active['column_counts']['proposals'] == 2
    assert active['column_counts']['ready'] == 1
    proposals = staff_client.get('/api/workflow/board/?column=proposals').data
    assert {row['journey']['key'] for row in proposals['results']} == {'proposal', 'client'}
    assert proposals['count'] == 2
    ready = staff_client.get('/api/workflow/board/?column=ready').data
    assert ready['results'][0]['delivery_method'] == 'delivery'
    history = staff_client.get('/api/workflow/board/?column=completed').data
    assert history['count'] == 1
    assert history['results'][0]['journey']['key'] == 'delivered'
