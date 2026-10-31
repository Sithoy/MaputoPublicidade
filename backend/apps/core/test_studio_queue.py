from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.orders.models import Order
from apps.quotes.models import ArtworkProofVersion, QuoteItem, QuoteRequest

from .studio import technical_fingerprint
from .test_production import assert_no_finance


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()


@pytest.fixture
def art_quote(order):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.save()
    quote.items.update(needs_design=True)
    return quote


@pytest.mark.django_db
def test_agenda_tracks_current_art_lifecycle(staff_client, art_quote):
    quote = art_quote
    url = '/api/production/studio/'
    data = staff_client.get(url).data
    assert data['overview']['new'] == 1
    assert data['results'][0]['task'] == 'new'
    assert_no_finance(data)
    proof = ArtworkProofVersion.objects.create(quote=quote, version=1, file_name='art.pdf', technical_fingerprint=technical_fingerprint(quote))
    assert staff_client.get(url).data['overview']['draft'] == 1
    proof.published_at = timezone.now() - timedelta(days=4)
    proof.save()
    data = staff_client.get(url).data
    assert data['overview']['approval'] == data['overview']['followup'] == 1
    assert staff_client.get(url + '?task=followup').data['count'] == 1
    proof.client_decision = 'changes_requested'
    proof.client_comment = 'Aumentar o logótipo'
    proof.save()
    data = staff_client.get(url).data
    assert data['overview']['revisions'] == 1
    assert data['overview']['followup'] == 0
    assert data['results'][0]['client_comment'] == 'Aumentar o logótipo'
    proof.client_decision = 'approved'
    proof.save()
    assert staff_client.get(url).data['overview']['ready'] == 1
    quote.items.update(quantity=500)
    data = staff_client.get(url).data
    assert data['overview']['ready'] == 0  # stale approval never appears ready
    assert data['overview']['draft'] == 1


@pytest.mark.django_db
def test_new_draft_removes_old_approval_followup(staff_client, art_quote):
    ArtworkProofVersion.objects.create(quote=art_quote, version=1, file_name='old.pdf',
                                       published_at=timezone.now() - timedelta(days=5),
                                       technical_fingerprint=technical_fingerprint(art_quote))
    ArtworkProofVersion.objects.create(quote=art_quote, version=2, file_name='new.pdf')
    data = staff_client.get('/api/production/studio/').data
    assert data['overview']['draft'] == 1
    assert data['overview']['approval'] == data['overview']['followup'] == 0
    assert data['results'][0]['version'] == 2


@pytest.mark.django_db
def test_agenda_excludes_unauthorised_non_art_and_started_orders(staff_client, art_quote):
    url = '/api/production/studio/'
    art_quote.order.status = 'in_production'
    art_quote.order.save()
    assert staff_client.get(url).data['count'] == 0
    art_quote.order.status = 'approved'
    art_quote.order.save()
    art_quote.items.update(needs_design=False)
    assert staff_client.get(url).data['count'] == 0
    art_quote.items.update(needs_design=True)
    art_quote.proposal_stage = 'sent'
    art_quote.price_approved_at = None
    art_quote.save()
    assert staff_client.get(url).data['count'] == 0


@pytest.mark.django_db
def test_agenda_paginates_ten_and_counts_the_entire_queue(staff_client, art_quote):
    for number in range(11):
        quote = QuoteRequest.objects.create(client_name=f'Empresa {number}', status='approved', price_approved_at=timezone.now())
        QuoteItem.objects.create(quote=quote, description='Polo', quantity=200, needs_design=True)
        Order.objects.create(quote=quote, status='approved', final_price='100')
    url = '/api/production/studio/'
    with CaptureQueriesContext(connection) as queries:
        first = staff_client.get(url).data
    assert len(queries) <= 10  # overview must not issue one proof query per job
    second = staff_client.get(url + '?page=2').data
    assert first['count'] == first['overview']['all'] == 12
    assert len(first['results']) == 10 and len(second['results']) == 2
    assert not {row['reference'] for row in first['results']} & {row['reference'] for row in second['results']}
    filtered = staff_client.get(url + '?search=Empresa+10').data
    assert filtered['count'] == 1
    assert filtered['overview']['all'] == 12
    assert staff_client.get(url + '?task=unknown').status_code == 400


@pytest.mark.django_db
def test_agenda_is_staff_artwork_only(authenticated_client, art_quote):
    assert APIClient().get('/api/production/studio/').status_code in {401, 403}
    assert authenticated_client.get('/api/production/studio/').status_code == 403
    user = User.objects.create_user('finance-studio-test', is_staff=True)
    user.profile.staff_role = StaffRole.FINANCE
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    assert api.get('/api/production/studio/').status_code == 403
