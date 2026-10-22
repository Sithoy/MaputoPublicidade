"""Reception saves or sends proposals; only the client accepts their conditions."""

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.core.activity import record_activity

DOCUMENT_FIELDS = {
    "user", "client_name", "client_company", "client_email", "client_phone", "client_nuit",
    "billing_address", "final_price", "estimated_price", "notes", "terms", "valid_until",
    "estimated_delivery_days", "payment_option", "discount_type", "discount_amount",
    "discount_percentage", "tax_rate", "commercial_pricing",
}


def event(quote, actor, action, comment="", snapshot=None):
    record = {
        "action": action, "version": quote.proposal_version, "at": timezone.now().isoformat(),
        "actor_id": actor.pk, "actor": actor.get_full_name() or actor.email or actor.username,
        "comment": comment,
    }
    if snapshot is not None:
        record["snapshot"] = snapshot
    quote.proposal_history = [*quote.proposal_history, record]
    record_activity(action="status_changed", quote=quote, actor=actor,
                    comment=f"Proposta v{quote.proposal_version}: {action}. {comment}", is_internal=True)


def prepare(quote, actor):
    if quote.price_approved_at or hasattr(quote, "order"):
        raise ValidationError("A proposta já foi aceite pelo cliente ou convertida. Não altere as condições deste pedido.")
    quote.proposal_editors = [actor.pk] if quote.proposal_stage == "sent" else list(set([*quote.proposal_editors, actor.pk]))
    quote.proposal_stage = "draft"
    quote.proposal_prepared_by = actor
    quote.proposal_reviewed_by = None
    quote.proposal_reviewed_at = None
    quote.proposal_review_comment = ""
    quote.proposal_sent_at = None
    quote.status = "reviewing"
    if not quote.reception_owner_id:
        quote.reception_owner = actor
    event(quote, actor, "Preparação / revisão das condições")
    quote.save()


def require_sent(quote):
    if quote.proposal_stage not in {"legacy", "sent"} or (
        quote.proposal_stage == "legacy" and quote.status in {"received", "reviewing"}
    ):
        raise ValidationError("A proposta deve ser enviada antes da aceitação pelo cliente.")


def document_snapshot(quote):
    snapshot = {
        field: str(getattr(quote, field)) if getattr(quote, field) is not None else None
        for field in sorted(DOCUMENT_FIELDS)
    }
    snapshot["items"] = [
        {"id": item.pk, "description": item.description, "quantity": str(item.quantity),
         "unit_price": str(item.unit_price), "notes": item.notes}
        for item in quote.items.all()
    ]
    return snapshot


def transition(quote, actor, action, version, comment):
    if quote.proposal_version != version:
        raise ValidationError("A versão mudou. Atualize a proposta antes de continuar.")
    if quote.price_approved_at or hasattr(quote, "order") or quote.status == "cancelled":
        raise ValidationError("Este pedido já foi aceite, convertido ou cancelado.")
    if action not in {"save", "send"}:
        raise ValidationError("A aprovação interna foi removida. Guarde ou envie a proposta.")
    if quote.proposal_stage == "sent":
        raise ValidationError("Esta versão já foi enviada. Edite a proposta para preparar uma nova versão.")
    if quote.final_price is None or not quote.items.exists():
        raise ValidationError("Prepare os artigos, preços e condições antes de guardar ou enviar a proposta.")
    # Preserve the existing stored stage for compatibility; 'approved' now means ready to send.
    # Every saved revision or direct send has an immutable conditions snapshot, not an internal approval.
    if action == "save" or quote.proposal_stage != "approved" or quote.proposal_version == 0:
        quote.proposal_version += 1
    if not quote.proposal_prepared_by_id:
        quote.proposal_prepared_by = actor
    if not quote.reception_owner_id:
        quote.reception_owner = actor
    quote.proposal_stage = "approved" if action == "save" else "sent"
    quote.proposal_sent_at = timezone.now() if action == "send" else None
    quote.status = "quoted" if action == "send" else "reviewing"
    event(quote, actor, "Proposta guardada" if action == "save" else "Disponibilizada ao cliente / envio registado",
          comment, document_snapshot(quote))
    quote.save()
