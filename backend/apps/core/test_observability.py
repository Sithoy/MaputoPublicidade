import json
import logging
import secrets
import uuid
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import RequestFactory
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.accounts.roles import StaffCapability, has_staff_capability

from .email_telemetry import PrivateRequestLogFilter, filter_operational_event
from .models import MonitoringAlert, MonitoringBucket, MonitoringEvent, PortalNotification
from .observability import OperationalMonitoringMiddleware, capture_request

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def monitoring_settings(settings):
    settings.OBSERVABILITY_ENABLED = True
    cache.clear()
    cache.set('monitoring-retention', True, 86400)
    now = timezone.now().replace(second=30, microsecond=0)
    with patch('apps.core.observability.timezone.now', return_value=now):
        yield
    cache.clear()


def api_for(role):
    user = User.objects.create_user(f'monitor-{role}', is_staff=role != 'client', is_superuser=role == 'owner')
    user.profile.staff_role = role
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    return api, user


def request_for(route='public-art-review', method='GET', marker='example'):
    request = getattr(RequestFactory(), method.lower())(f'/api/art-review/{marker}/?token={marker}', HTTP_DNT='1', HTTP_SEC_GPC='1', HTTP_X_REQUEST_ID=marker, HTTP_AUTHORIZATION=marker, HTTP_USER_AGENT=marker)
    request.resolver_match = SimpleNamespace(view_name=route)
    return request


def test_security_collection_is_independent_of_browser_consent_and_sanitized(caplog):
    marker = secrets.token_urlsafe(24)
    request = request_for(marker=marker)
    response = OperationalMonitoringMiddleware(lambda req: Response({'code': 'link_invalid', 'private': marker}, status=404))(request)
    request_id = uuid.UUID(response['X-Request-ID'])
    assert str(request_id) != marker
    event = MonitoringEvent.objects.get()
    assert event.request_id == request_id and event.code == 'link_invalid'
    assert event.route == 'public-art-review'
    assert marker not in json.dumps(list(MonitoringEvent.objects.values()), default=str)
    assert marker not in caplog.text
    assert set(field.name for field in MonitoringEvent._meta.fields) == {'id', 'minute', 'code', 'route', 'method', 'status', 'count', 'request_id', 'last_seen'}
    assert MonitoringBucket.objects.get().requests == 1


def test_counters_group_requests_and_measure_processing_without_visitor_identity():
    request = request_for('catalog-list')
    capture_request(request, Response(status=200), uuid.uuid4(), 100)
    capture_request(request, Response(status=503), uuid.uuid4(), 3000)
    bucket = MonitoringBucket.objects.get()
    assert (bucket.requests, bucket.server_errors, bucket.total_ms, bucket.max_ms, bucket.slow) == (2, 1, 3100, 3000, 1)
    for _ in range(2):
        capture_request(request, Response(status=503), uuid.uuid4(), 1)
    assert MonitoringEvent.objects.count() == 1
    assert MonitoringEvent.objects.get().count == 3


def test_unknown_paths_are_not_recorded_and_untrusted_codes_are_ignored():
    marker = secrets.token_urlsafe(24)
    request = request_for(marker=marker)
    request.resolver_match = None
    capture_request(request, Response({'code': marker}, status=403), uuid.uuid4(), 1)
    assert MonitoringEvent.objects.get().route == 'unmatched'
    request.resolver_match = SimpleNamespace(view_name='public-art-review')
    capture_request(request, Response({'code': marker}, status=404), uuid.uuid4(), 1)
    assert MonitoringEvent.objects.count() == 1


@pytest.mark.parametrize('code', ['link_expired', 'link_revoked', 'link_replaced', 'link_outdated', 'link_unavailable'])
def test_link_diagnostics_stay_distinct_and_do_not_trigger_invalid_link_alerts(code):
    capture_request(request_for(), Response({'code': code}, status=410 if code == 'link_expired' else 404), uuid.uuid4(), 1)
    assert MonitoringEvent.objects.get().code == code
    assert not MonitoringAlert.objects.exists()


def test_login_validation_is_separate_from_permission_failure():
    capture_request(request_for('headless:account_login', 'POST'), Response(status=400), uuid.uuid4(), 1)
    assert MonitoringEvent.objects.get().code == 'login_rejected'
    assert MonitoringBucket.objects.get().denied == 1


def test_monitoring_failure_cannot_break_the_application_or_log_exception_contents(caplog):
    marker = secrets.token_urlsafe(24)
    with patch('apps.core.observability.capture_request', side_effect=RuntimeError(marker)):
        middleware = OperationalMonitoringMiddleware(lambda req: Response({'ok': True}, status=201))
        for _ in range(2):
            response = middleware(request_for())
            assert response.status_code == 201 and response.data == {'ok': True}
            assert uuid.UUID(response['X-Request-ID'])
    assert marker not in caplog.text
    assert caplog.text.count('monitoring_write_failed') == 1


def test_disabled_collection_still_generates_a_request_id(settings):
    settings.OBSERVABILITY_ENABLED = False
    response = OperationalMonitoringMiddleware(lambda req: Response(status=403))(request_for())
    assert uuid.UUID(response['X-Request-ID'])
    assert not MonitoringBucket.objects.exists() and not MonitoringEvent.objects.exists()


def test_threshold_alerts_are_deduplicated_and_notify_management_only():
    _, owner = api_for('owner')
    _, admin = api_for('administrator')
    _, reception = api_for('receptionist')
    _, content = api_for('content')
    expected = {user.pk for user in User.objects.filter(is_staff=True, is_active=True) if has_staff_capability(user, StaffCapability.VIEW_OBSERVABILITY)}
    for _ in range(12):
        capture_request(request_for(), Response(status=429), uuid.uuid4(), 1)
    alert = MonitoringAlert.objects.get()
    assert alert.code == 'rate_limited' and alert.count == 10
    recipients = set(PortalNotification.objects.values_list('recipient_id', flat=True))
    assert recipients == expected
    assert {owner.pk, admin.pk} <= recipients
    assert not {reception.pk, content.pk} & recipients
    assert PortalNotification.objects.count() == len(expected)


@pytest.mark.parametrize('role', ['client', 'receptionist', 'production', 'commercial', 'finance', 'content'])
def test_observability_is_not_available_to_operational_or_marketing_roles(role):
    api, _ = api_for(role)
    assert api.get('/api/observability/report/').status_code == 403


@pytest.mark.parametrize('role', ['owner', 'administrator'])
def test_report_contains_real_backend_counts_and_explicit_coverage(role, quoted_quote):
    api, _ = api_for(role)
    capture_request(request_for(), Response({'code': 'link_expired'}, status=410), uuid.uuid4(), 100)
    response = api.get('/api/observability/report/?hours=24&category=security')
    assert response.status_code == 200
    assert response['Cache-Control'] == 'private, no-store'
    assert response.data['summary']['requests'] == 1
    assert response.data['summary']['average_ms'] == 100
    assert response.data['category'] == 'security'
    assert response.data['events'][0]['code'] == 'link_expired'
    assert response.data['business']['requests_created'] >= 1
    assert not response.data['coverage']['frontend_edge']
    assert not response.data['coverage']['external_alerts_verified']
    assert MonitoringBucket.objects.get().requests == 1  # Report does not inflate its own metrics.


def test_empty_report_does_not_invent_availability_or_latency():
    api, _ = api_for('owner')
    data = api.get('/api/observability/report/').data
    assert data['summary']['average_ms'] is None
    assert data['summary']['server_error_rate'] is None
    assert data['first_observed_at'] is None


@pytest.mark.parametrize('query', ['hours=2', 'category=unknown', 'page=0', 'page=1001', 'page=1.5', 'page=９'])
def test_report_rejects_unbounded_filters(query):
    api, _ = api_for('owner')
    assert api.get('/api/observability/report/?' + query).status_code == 400


def test_report_paginates_groups_and_filters_health_events():
    api, _ = api_for('owner')
    now = timezone.now()
    for index in range(22):
        MonitoringEvent.objects.create(minute=now - timedelta(minutes=index), code='server_error', route='catalog-list', method='GET', status=500, count=1, request_id=uuid.uuid4(), last_seen=now - timedelta(minutes=index))
    first = api.get('/api/observability/report/?category=health').data
    second = api.get('/api/observability/report/?category=health&page=2').data
    assert first['total_groups'] == 22 and len(first['events']) == 20
    assert len(second['events']) == 2
    assert api.get('/api/observability/report/?category=security').data['events'] == []


def test_retention_command_removes_only_outdated_monitoring_records(quoted_quote):
    now = timezone.now()
    MonitoringBucket.objects.create(minute=now - timedelta(days=31))
    MonitoringBucket.objects.create(minute=now)
    for age in [15, 1]:
        MonitoringEvent.objects.create(minute=now - timedelta(days=age), code='server_error', route='catalog-list', method='GET', status=500, count=1, request_id=uuid.uuid4(), last_seen=now - timedelta(days=age))
    old = MonitoringAlert.objects.create(window=now - timedelta(days=31), code='server_error', count=5)
    MonitoringAlert.objects.filter(pk=old.pk).update(created_at=now - timedelta(days=31))
    call_command('purge_monitoring')
    assert MonitoringBucket.objects.count() == 1 and MonitoringEvent.objects.count() == 1
    assert not MonitoringAlert.objects.exists()
    quoted_quote.refresh_from_db()


def test_external_error_filter_excludes_tokens_payloads_breadcrumbs_and_stack_locals():
    marker = secrets.token_urlsafe(24)
    request_id = uuid.uuid4()
    event = {'event_id': uuid.uuid4().hex, 'request': {'url': f'https://example.test/api/art-review/{marker}/?key={marker}', 'method': 'POST', 'data': marker, 'headers': {'Authorization': marker}}, 'user': {'email': marker}, 'message': marker, 'extra': {'payload': marker}, 'breadcrumbs': {'values': [{'message': marker}]}, 'transaction': marker, 'exception': {'values': [{'type': 'ValueError', 'value': marker, 'stacktrace': {'frames': [{'filename': 'view.py', 'lineno': 42, 'vars': {'value': marker}, 'context_line': marker}]}}]}, 'contexts': {'trace': {'trace_id': uuid.uuid4().hex, 'data': {'url': marker}}}}
    result = filter_operational_event(event, {'request': SimpleNamespace(monitoring_request_id=request_id)})
    assert marker not in json.dumps(result)
    assert result['transaction'] == 'public-art-review'
    assert result['tags']['request_id'] == str(request_id)
    assert result['exception']['values'][0]['stacktrace']['frames'][0]['lineno'] == 42


def test_email_oauth_remains_excluded_from_external_telemetry():
    assert filter_operational_event({'request': {'url': 'https://example.test/api/integrations/email/oauth/callback/'}}, {}) is None


def test_production_http_console_logs_use_route_names_instead_of_private_urls(settings):
    settings.DEBUG = False
    marker = secrets.token_urlsafe(24)
    request = request_for(marker=marker)
    request.monitoring_request_id = uuid.uuid4()
    record = logging.LogRecord('django.request', logging.WARNING, 'view.py', 1, 'Not Found: %s', (request.path,), None)
    record.request = request
    record.status_code = 404
    record.exc_text = marker
    assert PrivateRequestLogFilter().filter(record)
    assert marker not in record.getMessage()
    assert 'public-art-review' in record.getMessage() and str(request.monitoring_request_id) in record.getMessage()
    assert record.exc_text is None


def test_development_logging_is_not_rewritten(settings):
    settings.DEBUG = True
    record = logging.LogRecord('django.request', logging.WARNING, 'view.py', 1, 'Development diagnostic', (), None)
    assert PrivateRequestLogFilter().filter(record)
    assert record.getMessage() == 'Development diagnostic'
