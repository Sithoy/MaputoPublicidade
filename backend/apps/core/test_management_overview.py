from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.orders.models import Order
from apps.quotes.models import QuoteRequest

from .management_overview import attention
from .test_production import assert_no_finance
from .workflow_board import workflow_rows

URL = '/api/management/overview/'


@pytest.mark.django_db
def test_active_population_deduplicates_and_uses_shared_workflow(staff_client, order):
    quote = order.quote
    quote.price_approved_at = timezone.now()
    quote.save()
    Order.objects.create(status='cancelled')
    Order.objects.create(status='delivered')
    QuoteRequest.objects.create(status='cancelled')
    QuoteRequest.objects.create(client_name='A preparar proposta', reception_completed_at=timezone.now())
    QuoteRequest.objects.create(client_name='Aguarda decisão', proposal_stage='sent')
    response = staff_client.get(URL)
    assert response.status_code == 200
    assert response['Cache-Control'] == 'private, no-store'
    data = response.data
    assert data['counts']['active'] == 3
    assert sum(column['count'] for column in data['columns']) == 3
    proposals = next(column for column in data['columns'] if column['key'] == 'proposals')
    assert proposals['count'] == 2
    assert proposals['waiting_client'] == 1
    assert data['counts']['attention'] == 0  # waiting is not a failure
    assert data['counts']['unscheduled'] == 1
    assert_no_finance(data)


@pytest.mark.django_db
def test_attention_is_distinct_and_preserves_all_reasons(staff_client):
    today = timezone.localdate()
    expired = QuoteRequest.objects.create(proposal_stage='sent', valid_until=today - timedelta(days=1),
        reception_follow_up_date=today - timedelta(days=1))
    QuoteRequest.objects.create(proposal_stage='sent', valid_until=today + timedelta(days=1))
    data = staff_client.get(URL).data
    assert data['counts']['attention'] == 2
    assert data['counts']['overdue'] == 1
    assert data['counts']['risk'] == 1
    assert data['exceptions'][0]['reference'] == expired.reference
    assert len(data['exceptions'][0]['issues']) == 2
    assert sum(data['counts'][key] for key in ('overdue', 'blocked', 'risk')) == data['counts']['attention']


def test_technical_dependency_is_blocked_but_client_wait_is_not():
    row = {'issues': [], 'journey': {'blocker': 'Informação técnica por confirmar', 'key': 'production'}}
    assert attention(row) == 'blocked'
    row['journey']['key'] = 'art_client'
    assert attention(row) is None


@pytest.mark.django_db
def test_commitment_window_uses_maputo_days_and_excludes_requested_dates(staff_client, monkeypatch):
    now = datetime(2026, 11, 3, 23, tzinfo=dt_timezone.utc)  # 4 November in Maputo
    monkeypatch.setattr(timezone, 'now', lambda: now)
    today = timezone.localdate(now)
    before = Order.objects.create(status='ready', scheduled_date=now - timedelta(hours=3))  # previous local day
    earlier_today = Order.objects.create(status='ready', scheduled_date=now - timedelta(minutes=30))
    later = Order.objects.create(status='in_production', scheduled_date=now + timedelta(days=9))
    QuoteRequest.objects.create(reception_briefing={'requested_date': str(today)})
    short = staff_client.get(URL + '?days=7').data
    assert short['counts']['deliveries'] == 1
    assert short['deliveries'][0]['order_reference'] == earlier_today.reference
    assert short['deliveries'][0]['attention'] == 'overdue'
    assert before.reference not in {row['order_reference'] for row in short['deliveries']}
    long = staff_client.get(URL + '?days=14').data
    assert long['counts']['deliveries'] == 2
    assert later.reference in {row['order_reference'] for row in long['deliveries']}
    assert long['counts']['active'] == short['counts']['active']
    assert long['counts']['attention'] == short['counts']['attention']
    assert staff_client.get(URL + '?days=invalid').status_code == 400
    assert staff_client.get(URL + '?days=90').status_code == 400


@pytest.mark.django_db
def test_population_not_capped_at_board_page_size_and_update_age_is_honest(staff_client, staff_user, order):
    quote = order.quote
    old = timezone.now() - timedelta(days=15)
    QuoteRequest.objects.filter(pk=quote.pk).update(updated_at=old)
    for index in range(81):
        QuoteRequest.objects.create(client_name=f'Entreprise {index}')
    data = staff_client.get(URL).data
    assert data['counts']['active'] == 82
    # Order updated today: do not show the linked quote's old timestamp.
    linked = next(row for row in workflow_rows(staff_user) if row['reference'] == quote.reference)
    assert linked['updated_at'] == order.updated_at


@pytest.mark.django_db
def test_manager_access_does_not_expand_staff_roles(staff_client, authenticated_client):
    assert authenticated_client.get(URL).status_code == 403
    assert APIClient().get(URL).status_code in (401, 403)
    for role in (StaffRole.PRODUCTION, StaffRole.RECEPTIONIST, StaffRole.CONTENT):
        user = User.objects.create_user(username=f'management-{role}', is_staff=True)
        user.profile.staff_role = role
        user.profile.save()
        client = APIClient()
        client.force_authenticate(user)
        assert client.get(URL).status_code == 403
    assert staff_client.get(URL).status_code == 200
