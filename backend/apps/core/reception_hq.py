"""Shared definitions for the reception overview and its paginated work queue."""

from django.db.models import Case, IntegerField, OuterRef, Q, Subquery, Value, When
from django.utils import timezone

from .models import SupportMessage
from .reception_briefing import reception_briefing
from .reception_lease import lease_state


def open_work(queryset):
    return queryset.exclude(status__in=["cancelled", "delivered"]).exclude(
        order__status__in=["cancelled", "delivered"]
    )


def task_filters():
    today = timezone.localdate()
    before_order = Q(order__isnull=True, price_approved_at__isnull=True)
    triage = Q(reception_completed_at__isnull=True, proposal_prepared_by__isnull=True,
               status__in=["received", "reviewing"], proposal_stage__in=["legacy", "draft"])
    return {
        "urgent": Q(urgency="urgent"),
        "today": Q(order__scheduled_date__date=today) | Q(reception_follow_up_date=today),
        "followup": Q(reception_follow_up_date__lte=today),
        "delivery_today": Q(order__scheduled_date__date=today),
        "overdue": Q(order__scheduled_date__date__lt=today) | Q(reception_follow_up_date__lt=today),
        "unassigned": Q(reception_owner__isnull=True),
        "new": before_order & triage & Q(status="received"),
        "briefing": before_order & triage,
        "proposal": before_order & ~triage & (Q(proposal_stage__in=["draft", "returned"]) | Q(proposal_stage="legacy", status__in=["received", "reviewing"])),
        "review": before_order & Q(proposal_stage="review"),  # Compatibility for saved filters.
        "send": before_order & Q(proposal_stage__in=["approved", "review"]),
        "client": before_order & (Q(proposal_stage="sent") | Q(proposal_stage="legacy", status="quoted")),
        "delivery": Q(order__status="ready"),
        "production": Q(order__status__in=["approved", "in_production"]),
        "handover": Q(order__isnull=True, price_approved_at__isnull=False),
    }


def prioritize(queryset):
    return queryset.annotate(_hq_priority=Case(
        When(task_filters()["overdue"], then=Value(-1)),
        When(urgency="urgent", then=Value(0)),
        When(proposal_stage="returned", then=Value(1)),
        When(order__status="ready", then=Value(2)),
        When(proposal_stage="approved", then=Value(3)),
        default=Value(4), output_field=IntegerField(),
    )).order_by("_hq_priority", "updated_at", "pk")


def with_workdesk(queryset):
    """One correlated lookup, not one message query per queue row."""
    messages = SupportMessage.objects.filter(is_staff=True, sender__isnull=False).exclude(
        delivery_status="failed"
    ).filter(Q(conversation__quote_id=OuterRef("pk")) | Q(conversation__order__quote_id=OuterRef("pk")))
    return queryset.annotate(hq_last_message_at=Subquery(messages.order_by("-created_at", "-pk").values("created_at")[:1]))


def workdesk_context(quote):
    order = getattr(quote, "order", None)
    stage = quote.proposal_stage
    blocker = ""
    waiting_since = None
    if quote.status == "cancelled" or (order and order.status == "cancelled"):
        label, action = "Cancelado", "Consultar histórico"
    elif quote.status == "delivered" or (order and order.status == "delivered"):
        label, action = "Entregue", "Consultar entrega"
    elif order:
        label = order.get_status_display()
        action = "Coordenar entrega" if order.status == "ready" else "Consultar produção"
        if order.status != "ready":
            blocker = "Execução pela Produção"
    elif quote.price_approved_at:
        label, action = "Aceite pelo cliente", "Confirmar ordem de produção"
    elif stage in {"review", "approved"}:
        label, action = "Pronta para enviar", "Enviar proposta"
    elif stage == "sent" or (stage == "legacy" and quote.status == "quoted"):
        label, action, blocker = "Com o cliente", "Acompanhar decisão", "Decisão do cliente"
        waiting_since = quote.proposal_sent_at
    elif stage == "returned":
        label, action = "Em preparação", "Preparar proposta"
    elif quote.reception_completed_at or quote.proposal_prepared_by_id:
        label, action = "Em preparação", "Preparar proposta"
    else:
        label = "Novo pedido" if quote.status == "received" else "Em triagem"
        action = "Completar briefing"
    contacts = [value for value in [getattr(quote, "hq_last_message_at", None), quote.proposal_sent_at] if value]
    return {
        "edit_session": lease_state(quote),
        "stage_label": label, "next_action": action, "blocker": blocker,
        "waiting_since": waiting_since,
        "owner_id": quote.reception_owner_id,
        "owner_name": (quote.reception_owner.get_full_name() or quote.reception_owner.username) if quote.reception_owner else "",
        "requested_date": reception_briefing(quote)["deadline"],
        "confirmed_date": order.scheduled_date if order else None,
        "follow_up_date": quote.reception_follow_up_date,
        "follow_up_note": quote.reception_follow_up_note,
        "last_contact_at": max(contacts) if contacts else None,
    }
