from importlib import import_module
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.apps import apps
from django.core.cache import cache
from django.db import connection
from rest_framework.test import APIClient

from .models import TrafficCounter, TrafficEvent
from .test_traffic import NOW, api_for, payload, stored


@pytest.fixture(autouse=True)
def isolated_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_automatic_collection_only_stores_daily_totals():
    api = APIClient()
    for _ in range(2):
        assert api.post('/api/website-traffic/events/', {'mode': 'aggregate', 'kind': 'page_view', 'path': '/'}, format='json').status_code == 204
    row = TrafficCounter.objects.get()
    assert row.count == 2 and row.path == '/' and row.kind == 'page_view'
    assert set(field.name for field in TrafficCounter._meta.fields) == {'id', 'day', 'path', 'kind', 'count'}
    assert not TrafficEvent.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize('extra', [
    {'visitor_id': 'private'}, {'event_id': 'identifier'}, {'session_id': 'private'},
    {'device': 'desktop'}, {'source': 'google'}, {'email': 'person@example.com'},
    {'consent': True}, {'aggregate': False}, {'kind': 'signup_completed'}, {'path': '/area-cliente'},
])
def test_aggregate_mode_rejects_identifiers_details_and_private_routes(extra):
    response = APIClient().post('/api/website-traffic/events/', {'mode': 'aggregate', 'kind': 'page_view', 'path': '/', **extra}, format='json')
    assert response.status_code == 400
    assert not TrafficCounter.objects.exists() and not TrafficEvent.objects.exists()


@pytest.mark.django_db
def test_consent_transition_adds_detail_without_recounting_public_view():
    api = APIClient()
    api.post('/api/website-traffic/events/', {'mode': 'aggregate', 'kind': 'page_view', 'path': '/'}, format='json')
    data = payload(mode='optional', aggregate=False)
    for _ in range(2):
        assert api.post('/api/website-traffic/events/', data, format='json').status_code == 204
    assert TrafficCounter.objects.get().count == 1 and TrafficEvent.objects.count() == 1
    report = api_for('content').get('/api/website-traffic/report/?days=7').data
    assert report['summary']['page_views'] == report['optional_summary']['page_views'] == 1
    assert report['summary']['visitors'] == 1


@pytest.mark.django_db
def test_optional_events_increment_aggregate_once_and_never_degrade_on_refusal():
    api = APIClient()
    data = payload(mode='optional')
    api.post('/api/website-traffic/events/', data, format='json')
    api.post('/api/website-traffic/events/', data, format='json')
    assert TrafficCounter.objects.get().count == 1
    assert api.post('/api/website-traffic/events/', payload(mode='optional', consent=False), format='json').status_code == 400
    assert api.post('/api/website-traffic/events/', payload(mode='optional', kind='quote_click', aggregate=False), format='json').status_code == 400
    assert TrafficCounter.objects.get().count == 1


@pytest.mark.django_db
@pytest.mark.parametrize('headers', [{'HTTP_DNT': '1'}, {'HTTP_SEC_GPC': '1'}, {'HTTP_USER_AGENT': 'ExampleBot/1'}])
def test_privacy_signals_suppress_both_layers(headers):
    api = APIClient()
    assert api.post('/api/website-traffic/events/', {'mode': 'aggregate', 'kind': 'page_view', 'path': '/'}, format='json', **headers).status_code == 204
    assert not TrafficCounter.objects.exists() and not TrafficEvent.objects.exists()


@pytest.mark.django_db
def test_public_counts_do_not_inflate_consented_visitors_or_conversion_rate():
    api = APIClient()
    api.post('/api/website-traffic/events/', {'mode': 'aggregate', 'kind': 'page_view', 'path': '/'}, format='json')
    api.post('/api/website-traffic/events/', {'mode': 'aggregate', 'kind': 'quote_submitted', 'path': '/'}, format='json')
    report = api_for('content').get('/api/website-traffic/report/?days=7').data
    assert report['summary']['page_views'] == report['summary']['requests'] == 1
    assert report['optional_summary']['page_views'] == report['optional_summary']['requests'] == 0
    assert report['summary']['visitors'] == report['summary']['sessions'] == 0
    assert report['summary']['request_session_rate'] is None
    assert report['pages'] == [{'path': '/', 'views': 1}]
    assert report['sources'] == report['devices'] == []


@pytest.mark.django_db
def test_migration_preserves_existing_counts_without_copying_identifiers():
    stored()
    stored(path='/catalogo')
    stored(kind='signup_completed')
    TrafficCounter.objects.all().delete()
    migration = import_module('apps.core.migrations.0018_trafficcounter')
    with patch.object(migration.timezone, 'now', return_value=NOW):
        migration.preserve_recorded_counts(apps, SimpleNamespace(connection=connection))
    assert sum(TrafficCounter.objects.values_list('count', flat=True)) == 2
    assert not TrafficCounter.objects.filter(kind='signup_completed').exists()
    assert TrafficEvent.objects.count() == 3
