"""Internal approval is distinct from client acceptance; keep revisions on the same request."""

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.core.activity import record_activity
from apps.core.models import PortalNotification

DOCUMENT_FIELDS = {
    "user",
    "client_name",
    "client_company",
    "client_email",
    "client_phone",
    "client_nuit",
    "billing_address",
    "final_price",
    "estimated_price",
    "notes",
    "terms",
    "valid_until",
    "estimated_delivery_days",
    "payment_option",
    "discount_type",
    "discount_amount",
    "discount_percentage",
    "tax_rate",
    "commercial_pricing",
}


def event(quote, actor, action, comment="", snapshot=None):
    record = {
        "action": action,
        "version": quote.proposal_version,
        "at": timezone.now().isoformat(),
        "actor_id": actor.pk,
        "actor": actor.get_full_name() or actor.email or actor.username,
        "comment": comment,
    }
    if snapshot is not None:
        record["snapshot"] = snapshot
    quote.proposal_history = [*quote.proposal_history, record]
    record_activity(
        action="status_changed",
        quote=quote,
        actor=actor,
        comment=f"Proposta v{quote.proposal_version}: {action}. {comment}",
        is_internal=True,
    )


def prepare(quote, actor):
    if quote.price_approved_at or hasattr(quote, "order"):
        raise ValidationError(
            "A proposta já foi aceite pelo cliente ou convertida. Não altere as condições deste pedido."
        )
    quote.proposal_editors = (
        [actor.pk]
        if quote.proposal_stage == "sent"
        else list(set([*quote.proposal_editors, actor.pk]))
    )
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
        raise ValidationError(
            "A proposta deve ser aprovada internamente e enviada antes da aceitação pelo cliente."
        )


def transition(quote, actor, action, version, comment):
    if quote.proposal_version != version:
        raise ValidationError("A versão mudou. Atualize a proposta antes de continuar.")
    if quote.price_approved_at or hasattr(quote, "order"):
        raise ValidationError("Este pedido já foi aceite ou convertido.")
    if action == "submit":
        if (
            quote.proposal_stage not in {"draft", "returned"}
            or quote.final_price is None
            or not quote.items.exists()
        ):
            raise ValidationError("Prepare os artigos, preços e condições antes de submeter.")
        quote.proposal_version += 1
        quote.proposal_stage = "review"
        if not quote.proposal_prepared_by_id:
            quote.proposal_prepared_by = actor
        snapshot = {
            field: str(getattr(quote, field)) if getattr(quote, field) is not None else None
            for field in sorted(DOCUMENT_FIELDS)
        }
        snapshot["items"] = [
            {
                "id": item.pk,
                "description": item.description,
                "quantity": str(item.quantity),
                "unit_price": str(item.unit_price),
                "notes": item.notes,
            }
            for item in quote.items.all()
        ]
        event(quote, actor, "Submetida para aprovação", comment, snapshot)
    elif action in {"approve", "return"}:
        if not has_staff_capability(actor, StaffCapability.REVIEW_PROPOSALS):
            raise PermissionDenied("Só o Comercial / administração pode rever propostas.")
        if quote.proposal_stage != "review":
            raise ValidationError("A proposta não está a aguardar aprovação interna.")
        if actor.pk == quote.proposal_prepared_by_id or actor.pk in quote.proposal_editors:
            raise ValidationError("Quem preparou a proposta não pode aprovar a própria versão.")
        if action == "return" and not comment.strip():
            raise ValidationError("Indique os ajustes necessários antes de devolver.")
        quote.proposal_stage = "approved" if action == "approve" else "returned"
        quote.proposal_reviewed_by = actor
        quote.proposal_reviewed_at = timezone.now()
        quote.proposal_review_comment = comment
        event(
            quote,
            actor,
            "Aprovada internamente" if action == "approve" else "Devolvida para ajustes",
            comment,
        )
    elif action == "send":
        if quote.proposal_stage != "approved":
            raise ValidationError("Apenas a versão aprovada internamente pode ser enviada.")
        quote.proposal_stage = "sent"
        quote.proposal_sent_at = timezone.now()
        quote.status = "quoted"
        event(quote, actor, "Disponibilizada ao cliente / envio registado", comment)
    quote.save()
    if action == "submit":
        recipients = [
            user
            for user in User.objects.filter(is_staff=True, is_active=True).select_related("profile")
            if user.pk != quote.proposal_prepared_by_id
            and has_staff_capability(user, StaffCapability.REVIEW_PROPOSALS)
        ]
    elif action in {"approve", "return"}:
        recipients = list(
            User.objects.filter(
                pk=quote.reception_owner_id or quote.proposal_prepared_by_id, is_active=True
            )
        )
    else:
        recipients = []
    PortalNotification.objects.bulk_create(
        [
            PortalNotification(
                recipient=user,
                title=f"{quote.reference}: {quote.get_proposal_stage_display()}",
                href=f"/admin/orcamentos/{quote.reference}",
            )
            for user in recipients
        ]
    )
