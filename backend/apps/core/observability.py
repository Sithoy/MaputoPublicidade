"""Consent-independent operational telemetry with an intentionally narrow schema."""
import json
import logging
import time
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models import F, Max, Sum
from django.db.models.functions import Greatest
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.orders.models import Order
from apps.quotes.models import QuoteRequest

from .models import MonitoringAlert, MonitoringBucket, MonitoringEvent, PortalNotification
from .permissions import HasStaffCapability

logger = logging.getLogger('mp.observability')
EVENTS = {
    'server_error': 'Falha no backend',
    'login_rejected': 'Entrada recusada / dados inválidos',
    'access_denied': 'Acesso recusado',
    'rate_limited': 'Limite de pedidos atingido',
    'link_invalid': 'Link inválido',
    'link_expired': 'Link expirado',
    'link_revoked': 'Link revogado',
    'link_replaced': 'Link substituído',
    'link_outdated': 'Arte desatualizada',
    'link_unavailable': 'Arte indisponível',
}
# Initial triage thresholds, not proof of an attack. Cooldown: 30 minutes.
RULES = {'server_error': 5, 'access_denied': 20, 'login_rejected': 10, 'rate_limited': 10, 'link_invalid': 20}
METHODS = {'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'}


def purge_monitoring(now=None):
    now = now or timezone.now()
    MonitoringEvent.objects.filter(minute__lt=now - timedelta(days=14)).delete()
    MonitoringBucket.objects.filter(minute__lt=now - timedelta(days=30)).delete()
    MonitoringAlert.objects.filter(created_at__lt=now - timedelta(days=30)).delete()


def safe_log(code, request_id, **numbers):
    # All callers supply fixed codes and numeric values; never log request/exception objects.
    logger.warning('MP_MONITORING %s', json.dumps({'code': code, 'request_id': str(request_id), **numbers}, separators=(',', ':')))


def check_alert(code, now, request_id):
    if code not in RULES:
        return
    total = MonitoringEvent.objects.filter(code=code, minute__gte=(now - timedelta(minutes=4)).replace(second=0, microsecond=0)).aggregate(total=Sum('count'))['total'] or 0
    if total < RULES[code]:
        return
    window = now.replace(minute=(now.minute // 30) * 30, second=0, microsecond=0)
    with transaction.atomic():
        alert, created = MonitoringAlert.objects.get_or_create(window=window, code=code, defaults={'count': total})
        if not created:
            return
        recipients = [user for user in get_user_model().objects.filter(is_staff=True, is_active=True).select_related('profile') if has_staff_capability(user, StaffCapability.VIEW_OBSERVABILITY)]
        PortalNotification.objects.bulk_create([
            PortalNotification(recipient=user, title=f'Monitorização: {EVENTS[code]} ({alert.count} em 5 min)', href='/admin/monitorizacao?view=seguranca') for user in recipients
        ])
    safe_log('alert_' + code, request_id, count=total)


def capture_request(request, response, request_id, duration_ms):
    now = timezone.now()
    minute = now.replace(second=0, microsecond=0)
    match = getattr(request, 'resolver_match', None)
    # The route NAME is code-owned. Never use path, query string, headers or kwargs.
    route = (match.view_name[:180] if match else 'unmatched')
    status = response.status_code
    if route in {'health-check', 'observability-report'} and status < 400:
        return
    method = request.method if request.method in METHODS else 'OTHER'
    code = ''
    if status >= 500:
        code = 'server_error'
    elif status == 429:
        code = 'rate_limited'
    elif status in {401, 403}:
        code = 'access_denied'
    elif status >= 400 and 'login' in route.lower():
        code = 'login_rejected'
    elif route == 'public-art-review' and status in {404, 410}:
        data = getattr(response, 'data', None)
        candidate = data.get('code') if isinstance(data, dict) else None
        if candidate in EVENTS and candidate.startswith('link_'):
            code = candidate
    increments = {
        'requests': 1, 'server_errors': int(status >= 500),
        'denied': int(code in {'access_denied', 'login_rejected'}),
        'rate_limited': int(status == 429), 'slow': int(duration_ms >= 2000), 'total_ms': duration_ms,
    }
    # One bounded row per minute; F updates avoid lost increments across workers.
    MonitoringBucket.objects.get_or_create(minute=minute)
    MonitoringBucket.objects.filter(minute=minute).update(**{key: F(key) + value for key, value in increments.items()}, max_ms=Greatest(F('max_ms'), duration_ms))
    if code:
        event, _ = MonitoringEvent.objects.get_or_create(minute=minute, code=code, route=route, method=method, status=status, defaults={'request_id': request_id, 'last_seen': now})
        MonitoringEvent.objects.filter(pk=event.pk).update(count=F('count') + 1, request_id=request_id, last_seen=now)
        # Bounded console sampling. Database counts retain the observed total.
        if cache.add(f'monitoring-log:{minute.isoformat()}:{code}:{route}:{method}:{status}', True, 120):
            safe_log(code, request_id, status=status)
        check_alert(code, now, request_id)
    if cache.add('monitoring-retention', True, 86400):
        try:
            purge_monitoring(now)
        except Exception:
            cache.delete('monitoring-retention')
            raise


class OperationalMonitoringMiddleware:
    sync_capable = True
    async_capable = False

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = uuid.uuid4()  # Never trust an externally supplied identifier.
        request.monitoring_request_id = request_id
        started = time.monotonic()
        response = self.get_response(request)
        response['X-Request-ID'] = str(request_id)
        if settings.OBSERVABILITY_ENABLED:
            try:
                capture_request(request, response, request_id, min(600000, max(0, round((time.monotonic() - started) * 1000))))
            except Exception:
                # Monitoring must not break login/orders during a migration or outage.
                # Console output remains useful when the database cannot store events.
                try:
                    if cache.add('monitoring-write-failed', True, 60):
                        safe_log('monitoring_write_failed', request_id, status=response.status_code)
                except Exception:
                    pass
        return response


class MonitoringReport(APIView):
    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.VIEW_OBSERVABILITY)]

    def get(self, request):
        hours = request.query_params.get('hours', '24')
        category = request.query_params.get('category', 'all')
        page = request.query_params.get('page', '1')
        if hours not in {'1', '24', '168'} or category not in {'all', 'security', 'health'} or not page.isascii() or not page.isdigit() or len(page) > 4 or not 1 <= int(page) <= 1000:
            raise ValidationError('Período, categoria ou página inválidos.')
        now = timezone.now()
        start = now - timedelta(hours=int(hours))
        buckets = MonitoringBucket.objects.filter(minute__gte=start)
        stats = buckets.aggregate(**{key: Sum(key) for key in ['requests', 'server_errors', 'denied', 'rate_limited', 'slow', 'total_ms']}, max_ms=Max('max_ms'))
        stats = {key: value or 0 for key, value in stats.items()}
        stats['average_ms'] = round(stats['total_ms'] / stats['requests']) if stats['requests'] else None
        stats['server_error_rate'] = round(100 * stats['server_errors'] / stats['requests'], 2) if stats['requests'] else None
        events = MonitoringEvent.objects.filter(minute__gte=max(start, now - timedelta(days=14)))
        breakdown = list(events.values('code').annotate(count=Sum('count')).order_by('-count', 'code'))
        if category == 'security':
            events = events.exclude(code='server_error')
        elif category == 'health':
            events = events.filter(code='server_error')
        total = events.count()
        offset = (int(page) - 1) * 20
        rows = [{**row, 'label': EVENTS.get(row['code'], 'Evento operacional')} for row in events.order_by('-last_seen', '-id').values('code', 'route', 'method', 'status', 'count', 'request_id', 'last_seen')[offset:offset + 20]]
        last = MonitoringBucket.objects.order_by('-minute').values_list('minute', flat=True).first()
        first = MonitoringBucket.objects.order_by('minute').values_list('minute', flat=True).first()
        response = Response({
            'generated_at': now, 'hours': int(hours), 'category': category, 'start': start, 'enabled': settings.OBSERVABILITY_ENABLED,
            'last_observed_at': last, 'first_observed_at': first, 'summary': stats, 'breakdown': breakdown,
            'events': rows, 'page': int(page), 'page_size': 20, 'total_groups': total,
            'alerts': [{'code': alert.code, 'label': EVENTS.get(alert.code, alert.code), 'count': alert.count, 'created_at': alert.created_at} for alert in MonitoringAlert.objects.filter(created_at__gte=start).order_by('-created_at')[:10]],
            'rules': [{'code': code, 'label': EVENTS[code], 'threshold': threshold, 'window_minutes': 5, 'dedupe_minutes': 30} for code, threshold in RULES.items()],
            'business': {
                'requests_created': QuoteRequest.objects.filter(created_at__gte=start).count(),
                'orders_created': Order.objects.filter(created_at__gte=start).count(),
                'proposals_accepted': QuoteRequest.objects.filter(price_approved_at__gte=start).count(),
            },
            'coverage': {
                'backend': True, 'database': 'reachable', 'frontend_edge': False,
                'external_alerts_verified': False, 'sentry_configured': bool(settings.SENTRY_DSN),
                'uptime_monitor_verified': False, 'retention': {'buckets_days': 30, 'events_days': 14, 'alerts_days': 30, 'cleanup': 'On observed requests, at most daily; management command available for scheduling.'},
            },
        })
        response['Cache-Control'] = 'private, no-store'
        return response
