"""Shared definitions for the reception overview and its paginated work queue."""

from django.db.models import Case, IntegerField, Q, Value, When


def open_work(queryset):
    return queryset.exclude(status__in=["cancelled", "delivered"]).exclude(
        order__status__in=["cancelled", "delivered"]
    )


def task_filters():
    before_order = Q(order__isnull=True, price_approved_at__isnull=True)
    triage = Q(reception_completed_at__isnull=True, proposal_prepared_by__isnull=True,
               status__in=["received", "reviewing"], proposal_stage__in=["legacy", "draft"])
    return {
        "unassigned": Q(reception_owner__isnull=True),
        "briefing": before_order & triage & Q(reception_owner__isnull=False),
        "proposal": before_order & ~triage & (Q(proposal_stage__in=["draft", "returned"]) | Q(proposal_stage="legacy", status__in=["received", "reviewing"])),
        "review": before_order & Q(proposal_stage="review"),
        "send": before_order & Q(proposal_stage="approved"),
        "client": before_order & (Q(proposal_stage="sent") | Q(proposal_stage="legacy", status="quoted")),
        "delivery": Q(order__status="ready"),
        "production": Q(order__status__in=["approved", "in_production"]),
        "handover": Q(order__isnull=True, price_approved_at__isnull=False),
    }


def prioritize(queryset):
    return queryset.annotate(_hq_priority=Case(
        When(urgency="urgent", then=Value(0)),
        When(proposal_stage="returned", then=Value(1)),
        When(order__status="ready", then=Value(2)),
        When(proposal_stage="approved", then=Value(3)),
        default=Value(4), output_field=IntegerField(),
    )).order_by("_hq_priority", "updated_at", "pk")
