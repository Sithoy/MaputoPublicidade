from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.orders.models import Order
from apps.quotes.models import ArtworkProofVersion, QuoteRequest

from .job_workflow import STAGES, job_journey
from .permissions import HasStaffCapability
from .reception_deadlines import deadline_issues

BOARD_COLUMNS = {
    'requests': {'briefing'}, 'proposals': {'proposal', 'client'},
    'art': {'art', 'art_client'}, 'production': {'production'},
    'ready': {'delivery'}, 'completed': {'delivered'},
}


class WorkflowBoard(APIView):
    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.VIEW_ORDERS)]

    def get(self, request):
        # Operations may follow accepted work, never pre-commercial requests.
        commercial = has_staff_capability(request.user, StaffCapability.VIEW_QUOTES)
        quotes = QuoteRequest.objects.select_related('order').prefetch_related(
            'items', Prefetch('proof_versions', queryset=ArtworkProofVersion.objects.defer('private_content')))
        if not commercial:
            quotes = quotes.filter(order__isnull=False, order__status__in=['approved', 'in_production', 'ready', 'delivered'])
        rows = []
        for quote in quotes.exclude(status='cancelled').order_by('-updated_at', '-pk'):
            journey = job_journey(quote)
            if journey['cancelled'] or (not commercial and journey['index'] < 3):
                continue
            order = getattr(quote, 'order', None)
            items = list(quote.items.all())
            rows.append({'reference': quote.reference, 'quote_reference': quote.reference,
                'order_reference': order.reference if order else None,
                'client_name': quote.client_company or quote.client_name,
                'summary': items[0].description if items else 'Necessidade por confirmar',
                'journey': journey, 'scheduled_date': order.scheduled_date if order else None,
                'delivery_method': order.delivery_method if order else None,
                'issues': deadline_issues(quote, order, include_followup=commercial),
                'follow_up_date': quote.reception_follow_up_date if commercial else None,
                'updated_at': quote.updated_at})
        for order in Order.objects.filter(quote__isnull=True).exclude(status='cancelled').prefetch_related('items').select_related('user').order_by('-updated_at', '-pk'):
            if not commercial and order.status not in {'approved', 'in_production', 'ready', 'delivered'}:
                continue
            items = list(order.items.all())
            rows.append({'reference': order.reference, 'quote_reference': None,
                'order_reference': order.reference, 'client_name': order.client_name_display,
                'summary': items[0].description if items else 'Encomenda', 'journey': job_journey(order=order),
                'issues': deadline_issues(order=order, include_followup=False),
                'delivery_method': order.delivery_method,
                'scheduled_date': order.scheduled_date, 'follow_up_date': None, 'updated_at': order.updated_at})
        search = request.query_params.get('search', '').strip().casefold()[:160]
        if search:
            rows = [row for row in rows if search in f"{row['reference']} {row['client_name']} {row['summary']}".casefold()]
        counts = {key: sum(row['journey']['key'] == key for row in rows) for key, _ in STAGES}
        column_counts = {key: sum(counts[stage] for stage in stages) for key, stages in BOARD_COLUMNS.items()}
        column = request.query_params.get('column')
        if column is not None and column not in {'active', *BOARD_COLUMNS}:
            raise ValidationError('Coluna inválida.')
        stage = request.query_params.get('stage', 'active')
        if stage not in {'active', 'all', *counts}:
            raise ValidationError('Etapa inválida.')
        if column and column != 'active':
            rows = [row for row in rows if row['journey']['key'] in BOARD_COLUMNS[column]]
        elif column == 'active' or stage == 'active':
            rows = [row for row in rows if row['journey']['key'] != 'delivered']
        elif stage != 'all':
            rows = [row for row in rows if row['journey']['key'] == stage]
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            raise ValidationError('Página inválida.') from None
        count = len(rows)
        response = Response({'results': rows[(page - 1) * 80:page * 80], 'count': count,
            'page': page, 'page_size': 80, 'counts': counts, 'column_counts': column_counts, 'generated_at': timezone.now()})
        response['Cache-Control'] = 'private, no-store'
        return response
