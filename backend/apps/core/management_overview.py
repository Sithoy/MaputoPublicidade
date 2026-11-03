"""Current operational snapshot; no inferred stage-entry dates or financial totals."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability

from .permissions import HasStaffCapability
from .reception_deadlines import risk_hours
from .workflow_board import BOARD_COLUMNS, workflow_rows


def attention(row):
    kinds = {issue['kind'] for issue in row['issues']}
    blocked = bool(row['journey']['blocker']) and row['journey']['key'] not in {'client', 'art_client'}
    if kinds & {'expired', 'overdue'}:
        return 'overdue'
    if blocked:
        return 'blocked'
    if 'risk' in kinds:
        return 'risk'
    return None


class ManagementOverview(APIView):
    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.VIEW_DASHBOARD), HasStaffCapability(StaffCapability.VIEW_ORDERS)]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 7))
        except (ValueError, TypeError):
            raise ValidationError('Horizonte inválido.') from None
        if days not in {7, 14, 30}:
            raise ValidationError('Escolha 7, 14 ou 30 dias.')
        now = timezone.now()
        today = timezone.localdate(now)
        end = today + timedelta(days=days)
        rows = [row for row in workflow_rows(request.user) if row['journey']['key'] != 'delivered']
        for row in rows:
            row['attention'] = attention(row)
            row['days_since_update'] = max(0, (now - row['updated_at']).days)
        rank = {'overdue': 0, 'blocked': 1, 'risk': 2}
        exceptions = sorted([row for row in rows if row['attention']],
            key=lambda row: (rank[row['attention']], row['updated_at'], row['reference']))
        columns = []
        for key, stages in BOARD_COLUMNS.items():
            if key == 'completed':
                continue
            jobs = [row for row in rows if row['journey']['key'] in stages]
            oldest = min(jobs, key=lambda row: row['updated_at']) if jobs else None
            columns.append({'key': key, 'count': len(jobs),
                'attention_count': sum(bool(row['attention']) for row in jobs),
                'waiting_client': sum(row['journey']['key'] in {'client', 'art_client'} for row in jobs),
                'oldest_update': oldest})
        commitments = sorted([row for row in rows if row['scheduled_date'] and
            today <= timezone.localdate(row['scheduled_date']) < end], key=lambda row: row['scheduled_date'])
        operational = [row for row in rows if row['order_reference']]
        response = Response({'generated_at': now, 'timezone': 'Africa/Maputo',
            'risk_window_hours': risk_hours(), 'delivery_days': days, 'delivery_end_exclusive': end,
            'counts': {'active': len(rows), 'attention': len(exceptions),
                'overdue': sum(row['attention'] == 'overdue' for row in rows),
                'blocked': sum(row['attention'] == 'blocked' for row in rows),
                'risk': sum(row['attention'] == 'risk' for row in rows),
                'deliveries': len(commitments),
                'unscheduled': sum(not row['scheduled_date'] for row in operational)},
            'columns': columns, 'exceptions': exceptions, 'deliveries': commitments})
        response['Cache-Control'] = 'private, no-store'
        return response
