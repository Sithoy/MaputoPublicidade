"""Audited reception actions. Never silently renew a sent proposal or delivery."""
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.orders.models import Order
from apps.quotes.proposal_workflow import document_snapshot, event, prepare

from .activity import record_activity
from .models import PortalNotification
from .reception_deadlines import deadline_issues

TEAMS = {
    'reception': (StaffCapability.MANAGE_RECEPTION, 'Recepção'),
    'art': (StaffCapability.MANAGE_ARTWORK, 'Artes'),
    'production': (StaffCapability.MANAGE_ORDER_STATUS, 'Produção'),
    'delivery': (StaffCapability.MANAGE_DELIVERY, 'Entrega'),
}


class ResolutionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['complete_followup', 'reschedule_followup', 'revise_proposal', 'close_request', 'escalate', 'request_delivery'])
    reason = serializers.CharField(min_length=5, max_length=1000, trim_whitespace=True)
    next_date = serializers.DateField(required=False)
    proposed_delivery = serializers.DateTimeField(required=False)
    team = serializers.ChoiceField(choices=list(TEAMS), required=False)
    validity_days = serializers.ChoiceField(choices=[7, 15, 30, 60], required=False)

    def validate(self, attrs):
        if set(self.initial_data) - set(self.fields):
            raise ValidationError('Campos de resolução inválidos.')
        action = attrs['action']
        if action in {'reschedule_followup', 'escalate', 'request_delivery'}:
            if not attrs.get('next_date') or attrs['next_date'] < timezone.localdate():
                raise ValidationError({'next_date': 'Defina hoje ou uma data futura para acompanhar.'})
        if action == 'escalate' and not attrs.get('team'):
            raise ValidationError({'team': 'Escolha a equipa responsável.'})
        if action == 'request_delivery' and (not attrs.get('proposed_delivery') or attrs['proposed_delivery'] <= timezone.now()):
            raise ValidationError({'proposed_delivery': 'Proponha uma data e hora futura.'})
        if action == 'revise_proposal' and not attrs.get('validity_days'):
            raise ValidationError({'validity_days': 'Escolha a validade para a nova versão.'})
        return attrs


def resolve(quote, actor, values):
    order = Order.objects.select_for_update().filter(quote=quote).first()
    if quote.status in {'cancelled', 'delivered'} or (order and order.status in {'cancelled', 'delivered'}):
        raise ValidationError('Este trabalho está encerrado. Consulte o histórico.')
    action, reason = values['action'], values['reason']
    original = f"Seguimento anterior: {quote.reception_follow_up_date or 'não agendado'}; nota anterior: {quote.reception_follow_up_note or '—'}. Validade anterior: {quote.valid_until or 'não definida'}. Compromisso de entrega: {order.scheduled_date.isoformat() if order and order.scheduled_date else 'não confirmado'}."
    codes = {row['code'] for row in deadline_issues(quote, order)}
    if action in {'revise_proposal', 'close_request'}:
        if not has_staff_capability(actor, StaffCapability.MANAGE_QUOTES) or 'proposal_expired' not in codes:
            raise ValidationError('Esta ação exige uma proposta expirada, ainda não aceite e sem ordem operacional.')
        if action == 'revise_proposal':
            event(quote, actor, 'Proposta expirada: revisão solicitada', reason, document_snapshot(quote))
            quote.validity_days = values['validity_days']
            prepare(quote, actor)  # draft immediately blocks old approval links; no automatic send
        else:
            old = quote.status
            quote.status = 'cancelled'
            quote.reception_follow_up_date = None
            quote.reception_follow_up_note = ''
            quote.save()
            record_activity(action='status_changed', quote=quote, actor=actor, is_internal=True,
                from_status=old, to_status='cancelled', comment=f'Pedido não aceite encerrado após expiração. {reason} {original}')
    elif action in {'complete_followup', 'reschedule_followup'}:
        if not quote.reception_follow_up_date:
            raise ValidationError('Este pedido não tem um seguimento agendado.')
        quote.reception_follow_up_date = values.get('next_date') if action == 'reschedule_followup' else None
        quote.reception_follow_up_note = reason[:500] if action == 'reschedule_followup' else ''
        quote.save(update_fields=['reception_follow_up_date', 'reception_follow_up_note', 'updated_at'])
        record_activity(action='reception_follow_up', quote=quote, actor=actor, is_internal=True,
            comment=f'{action}: {reason}. {original} Novo seguimento: {quote.reception_follow_up_date or "concluído"}.')
    else:
        team = 'delivery' if action == 'request_delivery' else values['team']
        if team != 'reception' and not order:
            raise ValidationError('Confirme a ordem operacional antes de encaminhar para esta equipa.')
        capability, label = TEAMS[team]
        recipients = [user for user in User.objects.filter(is_staff=True, is_active=True).select_related('profile') if has_staff_capability(user, capability)]
        if not recipients:
            raise ValidationError('Não há utilizadores ativos autorizados nesta equipa. Contacte o administrador.')
        quote.reception_follow_up_date = values['next_date']
        quote.reception_follow_up_note = reason[:500]
        quote.save(update_fields=['reception_follow_up_date', 'reception_follow_up_note', 'updated_at'])
        proposed = values.get('proposed_delivery')
        detail = f' Data proposta: {proposed.isoformat()}; aguarda confirmação da equipa, sem alterar o compromisso.' if proposed else ''
        record_activity(action='reception_follow_up', quote=quote, actor=actor, is_internal=True,
            comment=f'Encaminhado a {label}: {reason}. {original}{detail} Novo seguimento: {quote.reception_follow_up_date}.')
        # Technical teams get a reference/attention notice, not commercial free text.
        href = f'/admin/entregas?encomenda={order.reference}' if team == 'delivery' else f'/admin/operacoes?pedido={quote.reference}' if team != 'reception' else f'/admin/recepcao?pedido={quote.reference}'
        for user in recipients:
            PortalNotification.objects.create(recipient=user,
                title=(f'{quote.reference}: data proposta {timezone.localtime(proposed):%d/%m/%Y %H:%M}; confirmar com a Recepção' if proposed else f'{quote.reference}: Recepção solicita atenção de {label}')[:255], href=href)
    return {'detail': 'Resolução registada no histórico.', 'action': action,
            'issues': deadline_issues(quote, order), 'follow_up_date': quote.reception_follow_up_date}
