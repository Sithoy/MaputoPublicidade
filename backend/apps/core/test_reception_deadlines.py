from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.core import signing
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.orders.models import Order
from apps.quotes.client_proposal import resolve_review_quote, review_link
from apps.quotes.models import QuoteRequest
from apps.quotes.proposal_workflow import transition

from .models import ActivityEvent, PortalNotification
from .reception_deadlines import deadline_filters, deadline_issues, risk_hours


@pytest.fixture
def moment(monkeypatch):
    value = timezone.now().replace(minute=0, second=0, microsecond=0)
    monkeypatch.setattr(timezone, 'now', lambda: value)
    return value


def reserve(api, quote):
    response = api.post(f'/api/reception/{quote.reference}/edit-session/', {'action': 'acquire'}, format='json')
    assert response.status_code == 200
    api.credentials(HTTP_X_RECEPTION_EDIT_TOKEN=response.data['token'])


def post(api, quote, **values):
    return api.post(f'/api/reception/{quote.reference}/resolve-attention/', values, format='json')


@pytest.fixture
def expired(quote, moment):
    quote.status = 'quoted'
    quote.proposal_stage = 'sent'
    quote.proposal_version = 2
    quote.proposal_sent_at = moment - timedelta(days=8)
    quote.validity_days = 7
    quote.valid_until = timezone.localdate(moment) - timedelta(days=1)
    quote.final_price = 100
    quote.save()
    return quote


@pytest.mark.django_db
def test_filters_match_flags_and_requested_dates_never_become_commitments(moment):
    today = timezone.localdate(moment)
    expired = QuoteRequest.objects.create(client_name='Expired', status='quoted', proposal_stage='sent', valid_until=today - timedelta(days=1))
    late = QuoteRequest.objects.create(client_name='Late followup', reception_follow_up_date=today - timedelta(days=1))
    near = QuoteRequest.objects.create(client_name='Near delivery', status='approved')
    Order.objects.create(quote=near, status='approved', scheduled_date=moment + timedelta(hours=10))
    ready = QuoteRequest.objects.create(client_name='Ready', status='ready')
    Order.objects.create(quote=ready, status='ready', scheduled_date=moment + timedelta(hours=10))
    overdue = QuoteRequest.objects.create(client_name='Overdue delivery', status='ready')
    Order.objects.create(quote=overdue, status='ready', scheduled_date=moment - timedelta(minutes=1))
    wished = QuoteRequest.objects.create(client_name='Only requested date', reception_briefing={'deadline': (today - timedelta(days=2)).isoformat()})
    for quote in [expired, late, near, ready, overdue, wished]:
        kinds = {row['kind'] for row in deadline_issues(quote)}
        for key, kind in [('expired', 'expired'), ('overdue', 'overdue'), ('at_risk', 'risk')]:
            expected = kind in kinds and (key != 'at_risk' or not kinds & {'overdue', 'expired'})
            assert QuoteRequest.objects.filter(pk=quote.pk).filter(deadline_filters()[key]).exists() is expected
    assert not deadline_issues(wished)
    assert not deadline_issues(ready)


@pytest.mark.django_db
def test_validity_uses_maputo_calendar_and_never_expires_accepted_or_closed_jobs(expired, moment):
    expired.valid_until = timezone.localdate(moment)
    expired.save()
    assert {row['code'] for row in deadline_issues(expired)} == {'proposal_expiring'}
    expired.price_approved_at = moment
    expired.save()
    assert not deadline_issues(expired)
    expired.status = 'cancelled'
    expired.reception_follow_up_date = timezone.localdate(moment) - timedelta(days=1)
    expired.save()
    assert not deadline_issues(expired)
    assert not QuoteRequest.objects.filter(pk=expired.pk).filter(deadline_filters()['overdue']).exists()


def test_threshold_is_configurable_and_bounded(settings):
    settings.RECEPTION_RISK_WINDOW_HOURS = 12
    assert risk_hours() == 12
    settings.RECEPTION_RISK_WINDOW_HOURS = 10000
    assert risk_hours() == 168
    settings.RECEPTION_RISK_WINDOW_HOURS = 'invalid'
    assert risk_hours() == 48


@pytest.mark.django_db
def test_revising_expired_proposal_preserves_snapshot_and_never_revives_old_link(staff_client, staff_user, expired, moment):
    old_token = review_link(expired).split('#token=')[1]
    previous_expiry = str(expired.valid_until)
    reserve(staff_client, expired)
    response = post(staff_client, expired, action='revise_proposal', reason='Confirmar condições com o cliente', validity_days=15)
    assert response.status_code == 200
    expired.refresh_from_db()
    assert expired.proposal_stage == 'draft'
    assert expired.proposal_sent_at is None and expired.valid_until is None
    assert expired.validity_days == 15 and expired.final_price == 100
    assert any(row.get('snapshot', {}).get('valid_until') == previous_expiry for row in expired.proposal_history)
    with pytest.raises((ValueError, signing.BadSignature, ValidationError)):
        resolve_review_quote(old_token)
    transition(expired, staff_user, 'send', expired.proposal_version, 'Condições revistas pelo atendimento')
    assert expired.valid_until == timezone.localdate(moment) + timedelta(days=15)
    with pytest.raises((ValueError, signing.BadSignature, ValidationError)):
        resolve_review_quote(old_token)
    assert resolve_review_quote(review_link(expired).split('#token=')[1]).pk == expired.pk


@pytest.mark.django_db
def test_followup_outcome_requires_reason_lease_and_preserves_original(staff_client, quote, moment):
    old = timezone.localdate(moment) - timedelta(days=2)
    quote.reception_follow_up_date, quote.reception_follow_up_note = old, 'Confirmar cor verde'
    quote.save()
    assert post(staff_client, quote, action='complete_followup', reason='Cliente contactado por telefone').status_code == 409
    reserve(staff_client, quote)
    assert post(staff_client, quote, action='complete_followup', reason='').status_code == 400
    assert staff_client.post(f'/api/reception/{quote.reference}/follow-up/', {'date': None, 'note': ''}, format='json').status_code == 400
    result = post(staff_client, quote, action='complete_followup', reason='Cliente contactado por telefone')
    assert result.status_code == 200
    quote.refresh_from_db()
    assert quote.reception_follow_up_date is None and quote.status != 'delivered'
    event = ActivityEvent.objects.filter(quote=quote, action='reception_follow_up').latest('pk')
    assert str(old) in event.comment and 'Confirmar cor verde' in event.comment
    assert event.is_internal


@pytest.mark.django_db
def test_delivery_reschedule_is_a_request_not_a_changed_promise(staff_client, order, moment):
    order.scheduled_date = moment - timedelta(hours=1)
    order.save()
    old = order.scheduled_date
    reserve(staff_client, order.quote)
    result = post(staff_client, order.quote, action='request_delivery', reason='Cliente pediu outro horário',
        next_date=str(timezone.localdate(moment)), proposed_delivery=(moment + timedelta(days=2)).isoformat())
    assert result.status_code == 200
    order.refresh_from_db()
    assert order.scheduled_date == old
    assert any(row['code'] == 'delivery_overdue' for row in result.data['issues'])
    assert PortalNotification.objects.filter(href=f'/admin/entregas?encomenda={order.reference}').exists()
    event = ActivityEvent.objects.filter(quote=order.quote, action='reception_follow_up').latest('pk')
    assert old.isoformat() in event.comment and 'aguarda confirmação' in event.comment
    # The delivery team records the actual new commitment through its existing route.
    actual = moment + timedelta(days=3)
    response = staff_client.post(f'/api/orders/{order.reference}/set-delivery/', {'scheduled_date': actual.isoformat()}, format='json')
    assert response.status_code == 200
    assert old.isoformat() in ActivityEvent.objects.filter(order=order, action='delivery_updated').latest('pk').comment


@pytest.mark.django_db
def test_close_expired_request_is_not_cancelling_an_accepted_order(staff_client, expired):
    reserve(staff_client, expired)
    assert post(staff_client, expired, action='close_request', reason='Cliente desistiu do pedido').status_code == 200
    expired.refresh_from_db()
    assert expired.status == 'cancelled'
    accepted = QuoteRequest.objects.create(client_name='Accepted job', status='approved', price_approved_at=timezone.now())
    order = Order.objects.create(quote=accepted, status='approved')
    reserve(staff_client, order.quote)
    assert post(staff_client, order.quote, action='close_request', reason='Não deve cancelar encomenda').status_code == 400
    order.refresh_from_db()
    assert order.status == 'approved'


@pytest.mark.django_db
def test_production_and_clients_cannot_resolve_or_receive_commercial_escalation_text(staff_client, authenticated_client, order, moment):
    user = User.objects.create_user('attention-production', is_staff=True)
    user.profile.staff_role = StaffRole.PRODUCTION
    user.profile.save()
    production = APIClient()
    production.force_authenticate(user)
    assert post(production, order.quote, action='escalate', reason='Discussão interna', team='production', next_date=str(timezone.localdate(moment))).status_code == 403
    assert post(authenticated_client, order.quote, action='escalate', reason='Discussão interna', team='production', next_date=str(timezone.localdate(moment))).status_code == 403
    reserve(staff_client, order.quote)
    result = post(staff_client, order.quote, action='escalate', reason='Condições comerciais confidenciais', team='production', next_date=str(timezone.localdate(moment)))
    assert result.status_code == 200
    notification = PortalNotification.objects.filter(recipient=user).latest('pk')
    assert 'confidenciais' not in notification.title
    assert notification.href.startswith('/admin/operacoes?pedido=')
    assert production.get(f'/api/quotes/{order.quote.reference}/').status_code == 403


@pytest.mark.django_db
def test_client_workspace_cannot_bypass_overdue_resolution(staff_client, expired, moment):
    old = timezone.localdate(moment) - timedelta(days=1)
    expired.reception_follow_up_date = old
    expired.save()
    reserve(staff_client, expired)
    response = staff_client.post(f'/api/quotes/{expired.reference}/client-workspace/', {
        'action': 'follow_up', 'version': 2, 'date': None, 'comment': '',
    }, format='json')
    assert response.status_code == 400
    assert 'Resolver pendências' in str(response.data)
    expired.refresh_from_db()
    assert expired.reception_follow_up_date == old
