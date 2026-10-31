"""Keep credentials and private request content out of operational telemetry."""
import logging
from urllib.parse import urlparse
from uuid import UUID

from django.conf import settings
from django.urls import Resolver404, resolve


class PrivateRequestLogFilter(logging.Filter):
    """Production Django HTTP logs use route names, never raw paths or exceptions."""

    def filter(self, record):
        if not settings.DEBUG and record.name in {'django.request', 'django.server'}:
            request = getattr(record, 'request', None)
            match = getattr(request, 'resolver_match', None)
            route = match.view_name if match else 'unmatched'
            request_id = getattr(request, 'monitoring_request_id', None)
            status = getattr(record, 'status_code', None)
            record.msg = f'HTTP response status={status if isinstance(status, int) else "unknown"} route={route} request_id={request_id if isinstance(request_id, UUID) else "unavailable"}'
            record.args = ()
            record.exc_info = None
            record.exc_text = None
            record.stack_info = None
        return True


def filter_email_event(event, hint):
    url = event.get('request', {}).get('url', '')
    transaction = event.get('transaction', '')
    if urlparse(url).path.startswith('/api/integrations/email/') or '/integrations/email/' in transaction:
        return None
    return event


def filter_operational_event(event, hint):
    """Allowlist external error metadata; never export bodies, tokens or locals."""
    if filter_email_event(event, hint) is None:
        return None
    request = event.get('request') or {}
    try:
        path = urlparse(request.get('url', '')[:2048]).path
        route = resolve(path).view_name
    except (Resolver404, ValueError, TypeError):
        route = 'unmatched'
    safe = {key: event[key] for key in ['event_id', 'timestamp', 'start_timestamp', 'platform', 'level', 'type', 'release', 'environment'] if key in event}
    safe['message'] = 'Operational event; sensitive details omitted.'
    safe['transaction'] = route
    safe['request'] = {'method': request.get('method') if request.get('method') in {'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'} else 'OTHER'}
    safe['tags'] = {'route': route}
    django_request = hint.get('request') or hint.get('django_request')
    request_id = getattr(django_request, 'monitoring_request_id', None)
    if isinstance(request_id, UUID):
        safe['tags']['request_id'] = str(request_id)
    if 'exception' in event:
        safe['exception'] = {'values': [{
            'type': value.get('type', 'ApplicationError'),
            'value': 'Details withheld; use the request ID and source location.',
            'stacktrace': {'frames': [{key: frame[key] for key in ['filename', 'function', 'module', 'lineno', 'colno', 'in_app'] if key in frame} for frame in value.get('stacktrace', {}).get('frames', [])]},
        } for value in event['exception'].get('values', [])]}
    trace = event.get('contexts', {}).get('trace', {})
    if trace:
        safe['contexts'] = {'trace': {key: trace[key] for key in ['trace_id', 'span_id', 'parent_span_id', 'op', 'status'] if key in trace}}
    if event.get('type') == 'transaction':
        safe['spans'] = []
    return safe
