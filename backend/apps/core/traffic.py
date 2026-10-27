"""Bounded, first-party website analytics; unrelated to private order tracking."""
import re
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.crypto import salted_hmac
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability

from .models import TrafficEvent
from .permissions import HasStaffCapability

MAPUTO = ZoneInfo('Africa/Maputo')
SOURCES = ['direct', 'google', 'bing', 'facebook', 'instagram', 'whatsapp', 'linkedin', 'referral']
KINDS = ['page_view', 'whatsapp_click', 'quote_click', 'signup_click', 'quote_submitted', 'signup_completed']
PUBLIC_PATH = re.compile(r'^/(?:|sobre|contactos|servicos(?:/[a-z0-9-]{1,120})?|catalogo(?:/[a-z0-9-]{1,120})?|portfolio(?:/[a-z0-9-]{1,120})?|orcamento|carrinho(?:/checkout)?|termos|privacidade|politica-cookies)$')


class EventInput(serializers.Serializer):
    event_id = serializers.UUIDField()
    visitor_id = serializers.UUIDField()
    session_id = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=KINDS)
    path = serializers.RegexField(regex=PUBLIC_PATH, max_length=180)
    source = serializers.ChoiceField(choices=SOURCES)
    device = serializers.ChoiceField(choices=['mobile', 'tablet', 'desktop'])
    consent = serializers.BooleanField()

    def validate(self, attrs):
        if set(self.initial_data) - set(self.fields) or not attrs['consent']:
            raise serializers.ValidationError('Evento inválido ou sem consentimento.')
        return attrs


class TrafficThrottle(AnonRateThrottle):
    rate = '60/min'
    scope = 'public_traffic'


def expire_events():
    # Opportunistic retention, at most once per worker/day; report queries are bounded too.
    if cache.add('traffic-retention-v1', True, 86400):
        TrafficEvent.objects.filter(created_at__lt=timezone.now() - timedelta(days=90)).delete()


class CollectTraffic(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [TrafficThrottle]

    def post(self, request):
        origin = request.headers.get('Origin')
        allowed = set(settings.CORS_ALLOWED_ORIGINS) | {
            'https://maputopublicidade.com', 'https://www.maputopublicidade.com',
        }
        if origin and origin not in allowed:
            raise PermissionDenied('Origem não autorizada.')
        if len(request.body) > 2048:
            raise ValidationError('Evento demasiado grande.')
        if request.headers.get('DNT') == '1' or request.headers.get('Sec-GPC') == '1' or re.search(r'bot|spider|crawl|headless|preview', request.headers.get('User-Agent', ''), re.I):
            return Response(status=204)
        serializer = EventInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        expire_events()
        TrafficEvent.objects.get_or_create(event_id=data['event_id'], defaults={
            'visitor_key': salted_hmac('traffic.visitor.v1', str(data['visitor_id'])).hexdigest(),
            'session_key': salted_hmac('traffic.session.v1', str(data['session_id'])).hexdigest(),
            **{key: data[key] for key in ['kind', 'path', 'source', 'device']},
        })
        return Response(status=204)


def summary(query):
    views = query.filter(kind='page_view')
    values = query.aggregate(
        page_views=Count('id', filter=Q(kind='page_view')),
        visitors=Count('visitor_key', distinct=True, filter=Q(kind='page_view')),
        sessions=Count('session_key', distinct=True, filter=Q(kind='page_view')),
        whatsapp_clicks=Count('id', filter=Q(kind='whatsapp_click')),
        requests=Count('id', filter=Q(kind='quote_submitted')),
        registrations=Count('id', filter=Q(kind='signup_completed')),
    )
    converted = views.filter(session_key__in=query.filter(kind='quote_submitted').values('session_key')).values('session_key').distinct().count()
    values['request_session_rate'] = round(100 * converted / values['sessions'], 1) if values['sessions'] else None
    return values


class TrafficReport(APIView):
    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.VIEW_TRAFFIC)]

    def get(self, request):
        raw = request.query_params.get('days', '30')
        if raw not in {'7', '30', '90'}:
            raise ValidationError('Escolha 7, 30 ou 90 dias.')
        days = int(raw)
        now = timezone.now()
        today = now.astimezone(MAPUTO).date()
        start_day = today - timedelta(days=days - 1)
        start = datetime.combine(start_day, time.min, tzinfo=MAPUTO)
        # Never retain or report events beyond the 90-day retention window.
        expire_events()
        retained = TrafficEvent.objects.filter(created_at__gte=now - timedelta(days=90), created_at__lte=now)
        current = retained.filter(created_at__gte=start)
        previous_start = start - timedelta(days=days)
        previous = retained.filter(created_at__gte=previous_start, created_at__lt=start)
        previous_available = previous_start >= now - timedelta(days=90)
        views = current.filter(kind='page_view')
        daily = {row['day']: row['views'] for row in views.annotate(day=TruncDate('created_at', tzinfo=MAPUTO)).values('day').annotate(views=Count('id'))}

        def ranking(field):
            return list(views.values(field).annotate(views=Count('id'), sessions=Count('session_key', distinct=True)).order_by('-views', field)[:10])

        first = retained.order_by('created_at').values_list('created_at', flat=True).first()
        response = Response({
            'days': days, 'timezone': 'Africa/Maputo', 'generated_at': now,
            'start': start_day, 'end': today, 'first_event_at': first,
            'summary': summary(current), 'previous': summary(previous) if previous_available else None,
            'daily': [{'date': start_day + timedelta(days=index), 'views': daily.get(start_day + timedelta(days=index), 0)} for index in range(days)],
            'pages': ranking('path'), 'sources': ranking('source'), 'devices': ranking('device'),
            'actions': list(current.exclude(kind='page_view').values('kind').annotate(count=Count('id')).order_by('-count', 'kind')),
        })
        response['Cache-Control'] = 'private, no-store'
        return response
