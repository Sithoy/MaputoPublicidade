"""Commitment-based attention flags. Requested delivery dates are not promises."""
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone


def risk_hours():
    try:
        return max(1, min(168, int(getattr(settings, 'RECEPTION_RISK_WINDOW_HOURS', 48))))
    except (ValueError, TypeError):
        return 48


def deadline_filters(now=None):
    now = now or timezone.now()
    today = timezone.localdate(now)
    horizon = now + timedelta(hours=risk_hours())
    last_day = timezone.localdate(horizon)
    sent = Q(order__isnull=True, price_approved_at__isnull=True) & (
        Q(proposal_stage='sent') | Q(proposal_stage='legacy', status='quoted'))
    expired = sent & Q(valid_until__lt=today)
    overdue = Q(reception_follow_up_date__lt=today) | Q(order__scheduled_date__lt=now)
    risk = (sent & Q(valid_until__gte=today, valid_until__lte=last_day)) | Q(
        reception_follow_up_date__gte=today, reception_follow_up_date__lte=last_day) | Q(
        order__status__in=['approved', 'in_production'],
        order__scheduled_date__gte=now, order__scheduled_date__lte=horizon)
    active = ~Q(status__in=['cancelled', 'delivered']) & ~Q(order__status__in=['cancelled', 'delivered'])
    return {'expired': active & expired, 'overdue': active & overdue, 'at_risk': active & risk & ~expired & ~overdue}


def deadline_issues(quote=None, order=None, *, include_followup=True, now=None):
    now = now or timezone.now()
    today = timezone.localdate(now)
    last_day = timezone.localdate(now + timedelta(hours=risk_hours()))
    order = order or (getattr(quote, 'order', None) if quote else None)
    if (quote and quote.status in {'cancelled', 'delivered'}) or (order and order.status in {'cancelled', 'delivered'}):
        return []
    rows = []
    def add(code, kind, label, due):
        rows.append({'code': code, 'kind': kind, 'label': label, 'due': due.isoformat()})
    if quote and not order and not quote.price_approved_at and (
        quote.proposal_stage == 'sent' or (quote.proposal_stage == 'legacy' and quote.status == 'quoted')
    ) and quote.valid_until:
        if quote.valid_until < today:
            add('proposal_expired', 'expired', 'Proposta expirada — rever antes de voltar a enviar', quote.valid_until)
        elif quote.valid_until <= last_day:
            add('proposal_expiring', 'risk', 'Validade da proposta a terminar', quote.valid_until)
    if quote and include_followup and quote.reception_follow_up_date:
        due = quote.reception_follow_up_date
        if due < today:
            add('followup_overdue', 'overdue', 'Seguimento em atraso — registar resultado ou reagendar', due)
        elif due <= last_day:
            add('followup_due', 'risk', 'Seguimento por realizar nesta janela de atenção', due)
    if order and order.scheduled_date:
        due = order.scheduled_date
        if due < now:
            add('delivery_overdue', 'overdue', 'Entrega / levantamento ultrapassou o compromisso confirmado', due)
        elif due <= now + timedelta(hours=risk_hours()) and order.status in {'approved', 'in_production'}:
            from .job_workflow import job_journey
            stage = job_journey(quote, order)['label']
            add('delivery_at_risk', 'risk', f'Entrega próxima; trabalho ainda em {stage}', due)
    return rows
