from django.contrib.auth.models import User
from django.db import models


class ActivityEvent(models.Model):
    """Immutable record of something that happened to a quote or order.

    Written by the views when status changes, approvals, conversions or
    payments occur. Events flagged is_internal are only shown to staff.
    """

    ACTION_CREATED = "created"
    ACTION_STATUS_CHANGED = "status_changed"
    ACTION_PRICE_APPROVED = "price_approved"
    ACTION_ARTWORK_PROOF_UPLOADED = "artwork_proof_uploaded"
    ACTION_ARTWORK_APPROVED = "artwork_approved"
    ACTION_ARTWORK_CHANGES_REQUESTED = "artwork_changes_requested"
    ACTION_CONVERTED_TO_ORDER = "converted_to_order"
    ACTION_PAYMENT_RECORDED = "payment_recorded"
    ACTION_PAYMENT_STATUS_CHANGED = "payment_status_changed"
    ACTION_DELIVERY_UPDATED = "delivery_updated"
    ACTION_DELIVERY_CONFIRMED = "delivery_confirmed"
    ACTION_CHOICES = [
        (ACTION_CREATED, "Pedido registado"),
        (ACTION_STATUS_CHANGED, "Estado actualizado"),
        (ACTION_PRICE_APPROVED, "Preço aprovado"),
        (ACTION_ARTWORK_PROOF_UPLOADED, "Prova de arte enviada"),
        (ACTION_ARTWORK_APPROVED, "Arte aprovada"),
        (ACTION_ARTWORK_CHANGES_REQUESTED, "Alterações à arte pedidas"),
        (ACTION_CONVERTED_TO_ORDER, "Convertido em encomenda"),
        (ACTION_PAYMENT_RECORDED, "Pagamento registado"),
        (ACTION_PAYMENT_STATUS_CHANGED, "Estado de pagamento actualizado"),
        (ACTION_DELIVERY_UPDATED, "Entrega actualizada"),
        (ACTION_DELIVERY_CONFIRMED, "Entrega confirmada pelo cliente"),
    ]

    quote = models.ForeignKey(
        "quotes.QuoteRequest",
        on_delete=models.CASCADE,
        related_name="activity_events",
        null=True,
        blank=True,
        verbose_name="orçamento",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="activity_events",
        null=True,
        blank=True,
        verbose_name="encomenda",
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="activity_events",
        null=True,
        blank=True,
        verbose_name="autor",
    )
    action = models.CharField("acção", max_length=40, choices=ACTION_CHOICES)
    from_status = models.CharField("estado anterior", max_length=30, blank=True)
    to_status = models.CharField("novo estado", max_length=30, blank=True)
    comment = models.TextField("comentário", blank=True)
    is_internal = models.BooleanField("interno", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "evento de actividade"
        verbose_name_plural = "eventos de actividade"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["quote", "-created_at"]),
            models.Index(fields=["order", "-created_at"]),
        ]

    def __str__(self):
        target = self.quote_id or self.order_id
        return f"{self.get_action_display()} — {target}"
