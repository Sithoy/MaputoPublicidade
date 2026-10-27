from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from unittest.mock import patch
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole

from .models import TrafficEvent

NOW = datetime(2026, 10, 26, 14, 30, tzinfo=dt_timezone.utc)


@pytest.fixture(autouse=True)
def clean_traffic_cache():
    cache.clear()
    yield
    cache.clear()


def payload(**changes):
    return {'event_id': str(uuid4()), 'visitor_id': str(uuid4()), 'session_id': str(uuid4()),
            'kind': 'page_view', 'path': '/', 'source': 'direct', 'device': 'mobile', 'consent': True, **changes}


def api_for(role):
    user = User.objects.create_user(f'traffic-{role}', is_staff=role != 'client', is_superuser=role == 'owner')
    user.profile.staff_role = role
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    return api


@pytest.mark.django_db
def test_private_minimal_collection_and_idempotency():
    api = APIClient()
    data = payload()
    for _ in range(2):
        assert api.post('/api/website-traffic/events/', data, format='json').status_code == 204
    event = TrafficEvent.objects.get()
    assert event.visitor_key != data['visitor_id'] and event.session_key != data['session_id']
    assert set(field.name for field in TrafficEvent._meta.fields) == {'id', 'event_id', 'visitor_key', 'session_key', 'kind', 'path', 'source', 'device', 'created_at'}


@pytest.mark.django_db
@pytest.mark.parametrize('change', [
    {'consent': False}, {'path': '/admin'}, {'path': '/area-cliente'}, {'path': '/arte/rever/private'},
    {'path': '/proposta'}, {'path': '/acompanhar'}, {'path': '/?token=secret'}, {'path': '/catalogo/private#secret'},
    {'visitor_id': 'person@example.com'}, {'source': 'https://example.com/person'},
    {'device': 'raw agent'}, {'kind': 'unknown'}, {'email': 'private@example.com'},
])
def test_sensitive_or_unbounded_data_is_rejected(change):
    response = APIClient().post('/api/website-traffic/events/', payload(**change), format='json')
    assert response.status_code == 400, response.data
    assert not TrafficEvent.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize('headers', [{'HTTP_DNT': '1'}, {'HTTP_SEC_GPC': '1'}, {'HTTP_USER_AGENT': 'ExampleBot/1'}])
def test_privacy_signals_and_known_bots_are_not_recorded(headers):
    assert APIClient().post('/api/website-traffic/events/', payload(), format='json', **headers).status_code == 204
    assert not TrafficEvent.objects.exists()


@pytest.mark.django_db
def test_origin_and_body_limits():
    api = APIClient()
    assert api.post('/api/website-traffic/events/', payload(), format='json', HTTP_ORIGIN='https://unrelated.example').status_code == 403
    assert api.post('/api/website-traffic/events/', payload(extra='x' * 2100), format='json').status_code == 400
    assert not TrafficEvent.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize('role,expected', [('owner', 200), (StaffRole.ADMINISTRATOR, 200), (StaffRole.CONTENT, 200), (StaffRole.COMMERCIAL, 403), (StaffRole.PRODUCTION, 403), (StaffRole.FINANCE, 403), (StaffRole.RECEPTIONIST, 403), ('client', 403)])
def test_report_role_permissions(role, expected):
    response = api_for(role).get('/api/website-traffic/report/?days=7')
    assert response.status_code == expected
    if expected == 200:
        assert response['Cache-Control'] == 'private, no-store'


@pytest.mark.django_db
def test_report_requires_authentication_and_valid_period():
    assert APIClient().get('/api/website-traffic/report/').status_code == 401
    assert api_for('content').get('/api/website-traffic/report/?days=9999').status_code == 400


@pytest.mark.django_db
def test_empty_report_does_not_invent_visitors_or_conversion():
    response = api_for('content').get('/api/website-traffic/report/?days=7')
    assert response.status_code == 200
    assert response.data['first_event_at'] is None
    assert len(response.data['daily']) == 7
    assert all(row['views'] == 0 for row in response.data['daily'])
    assert response.data['summary']['request_session_rate'] is None


def stored(kind='page_view', visitor='visitor', session='session', when=NOW, path='/', source='google'):
    row = TrafficEvent.objects.create(event_id=uuid4(), visitor_key=visitor, session_key=session, kind=kind, path=path, source=source, device='mobile')
    TrafficEvent.objects.filter(pk=row.pk).update(created_at=when)
    return row


@pytest.mark.django_db
def test_report_distinct_counts_conversion_and_maputo_dates():
    api = api_for('content')
    stored()
    stored(path='/catalogo')
    stored(session='second', visitor='second')
    stored(kind='quote_submitted')
    stored(kind='quote_submitted')
    stored(kind='whatsapp_click')
    # 22:30 UTC belongs to the next Maputo calendar day.
    stored(when=NOW.replace(day=25, hour=22, minute=30))
    stored(when=NOW - timedelta(days=8), session='previous')
    with patch('apps.core.traffic.timezone.now', return_value=NOW):
        report = api.get('/api/website-traffic/report/?days=7').data
    assert report['summary'] == {'visitors': 2, 'sessions': 2, 'page_views': 4, 'whatsapp_clicks': 1, 'requests': 2, 'registrations': 0, 'request_session_rate': 50.0}
    assert report['daily'][-1] == {'date': NOW.astimezone(ZoneInfo('Africa/Maputo')).date(), 'views': 4}
    assert report['previous']['page_views'] == 1
    assert report['sources'][0]['source'] == 'google'
    assert 'visitor_key' not in str(report) and 'session_key' not in str(report)


@pytest.mark.django_db
def test_retention_removes_old_events_and_does_not_compare_partial_baseline():
    api = api_for('content')
    old = stored(when=NOW - timedelta(days=91))
    stored()
    with patch('apps.core.traffic.timezone.now', return_value=NOW):
        report = api.get('/api/website-traffic/report/?days=90').data
    assert not TrafficEvent.objects.filter(pk=old.pk).exists()
    assert report['previous'] is None and report['summary']['page_views'] == 1


@pytest.mark.django_db
def test_collection_is_throttled():
    api = APIClient()
    data = payload()
    for _ in range(60):
        assert api.post('/api/website-traffic/events/', data, format='json').status_code == 204
    assert api.post('/api/website-traffic/events/', data, format='json').status_code == 429
