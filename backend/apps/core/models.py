from django.contrib.auth.models import User
from django.db import models


class SupportConversation(models.Model):
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="support_conversations")
    subject = models.CharField(max_length=160)
    quote = models.ForeignKey("quotes.QuoteRequest", null=True, blank=True, on_delete=models.SET_NULL)
    order = models.ForeignKey("orders.Order", null=True, blank=True, on_delete=models.SET_NULL)
    invoice = models.ForeignKey("invoices.Invoice", null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, default="awaiting_team", choices=[
        ("awaiting_team", "A aguardar a MP"), ("awaiting_client", "A aguardar o cliente"),
        ("resolved", "Resolvida"),
    ])
    client_read_id = models.PositiveBigIntegerField(default=0)
    staff_read_id = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        indexes = [models.Index(fields=["client", "-updated_at"]), models.Index(fields=["status", "-updated_at"])]


class SupportMessage(models.Model):
    conversation = models.ForeignKey(SupportConversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    is_staff = models.BooleanField(default=False)
    body = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class PortalNotification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="portal_notifications")
    title = models.CharField(max_length=255)
    href = models.CharField(max_length=255)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["recipient", "read_at"], name="core_portal_recipie_00c358_idx")]


class ActivityEvent(models.Model):
    """Immutable record of something that happened to a quote or order.

    Written by the views when status changes, approvals, conversions or
    payments occur. Events flagged is_internal are only shown to staff.
    """

    ACTION_CREATED = "created"
    ACTION_RECEPTION_CLAIMED = "reception_claimed"
    ACTION_RECEPTION_UPDATED = "reception_updated"
    ACTION_RECEPTION_HANDOFF = "reception_handoff"
    ACTION_RECEPTION_RELEASED = "reception_released"
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
        (ACTION_RECEPTION_UPDATED, "Briefing completado pela Recepção"),
        (ACTION_RECEPTION_CLAIMED, "Atendimento assumido pela Recepção"),
        (ACTION_RECEPTION_HANDOFF, "Encaminhado ao Comercial"),
        (ACTION_RECEPTION_RELEASED, "Devolvido à fila da Recepção"),
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
