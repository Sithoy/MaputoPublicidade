import uuid

from django.contrib.auth.models import User
from django.db import models


class TrafficCounter(models.Model):
    """Daily public counts without visitor, session, device or request identifiers."""

    day = models.DateField(db_index=True)
    path = models.CharField(max_length=180)
    kind = models.CharField(max_length=24)
    count = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['day', 'path', 'kind'], name='unique_traffic_counter')]


class TrafficEvent(models.Model):
    """Opt-in public-site events. No raw identifiers, IPs, URLs or user relation."""

    event_id = models.UUIDField(unique=True)
    visitor_key = models.CharField(max_length=64)
    session_key = models.CharField(max_length=64)
    kind = models.CharField(max_length=24)
    path = models.CharField(max_length=180)
    source = models.CharField(max_length=20)
    device = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)


class EmailConnection(models.Model):
    """Zoho mailbox configuration; the encrypted password is never serialized."""

    mailbox = models.EmailField(default="atendimento@maputopublicidade.com")
    display_name = models.CharField(max_length=160, default="Maputo Publicidade · Atendimento")
    smtp_host = models.CharField(max_length=100, default="smtppro.zoho.com")
    imap_host = models.CharField(max_length=100, default="imappro.zoho.com")
    credentials = models.TextField(blank=True)
    oauth_client_id = models.CharField(max_length=200, blank=True)
    oauth_secret = models.TextField(blank=True)
    oauth_refresh = models.TextField(blank=True)
    oauth_account_id = models.CharField(max_length=100, blank=True)
    oauth_state_hash = models.CharField(max_length=64, blank=True)
    oauth_state_expires = models.DateTimeField(null=True, blank=True)
    oauth_actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    sending_enabled = models.BooleanField(default=False)
    receiving_enabled = models.BooleanField(default=False)
    receiving_since = models.DateTimeField(null=True, blank=True)
    sync_start = models.PositiveIntegerField(default=1)
    sync_lock_until = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    tested_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class ReceptionEditLease(models.Model):
    quote = models.OneToOneField("quotes.QuoteRequest", on_delete=models.CASCADE, related_name="reception_edit_lease")
    editor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reception_edit_leases")
    token = models.UUIDField()
    expires_at = models.DateTimeField(db_index=True)


class SupportConversation(models.Model):
    email_stage = models.CharField(max_length=20, default='new', choices=[('new', 'Por tratar'), ('preparing', 'Em preparação'), ('waiting', 'A aguardar cliente'), ('resolved', 'Resolvido')])
    client = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name="support_conversations")
    channel = models.CharField(max_length=20, default="branddesk")
    email_thread_key = models.CharField(max_length=64, null=True, blank=True, unique=True)
    contact_email = models.EmailField(blank=True)
    whatsapp_phone = models.CharField(max_length=20, null=True, blank=True, unique=True)
    contact_name = models.CharField(max_length=160, blank=True)
    last_inbound_at = models.DateTimeField(null=True, blank=True)
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
    email_subject = models.CharField(max_length=255, blank=True)
    email_headers = models.JSONField(default=dict, blank=True)
    email_id = models.CharField(max_length=160, null=True, blank=True, unique=True)
    email_request_id = models.UUIDField(null=True, blank=True, unique=True)
    attachment = models.JSONField(default=dict, blank=True)
    template = models.JSONField(default=dict, blank=True)
    whatsapp_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    delivery_status = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=20, default="branddesk")
    conversation = models.ForeignKey(SupportConversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    is_staff = models.BooleanField(default=False)
    body = models.TextField(max_length=100000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class EmailDraft(models.Model):
    conversation = models.OneToOneField(SupportConversation, on_delete=models.CASCADE, related_name='email_draft')
    subject = models.CharField(max_length=255)
    body = models.TextField(blank=True, max_length=4000)
    template_key = models.CharField(max_length=40, blank=True)
    attachment_ids = models.JSONField(default=list, blank=True)
    version = models.PositiveIntegerField(default=0)
    request_id = models.UUIDField(default=uuid.uuid4)
    send_state = models.CharField(max_length=20, default='idle')
    updated_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)


class StaffEmailSignature(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_signature')
    display_name = models.CharField(max_length=160)
    title = models.CharField(max_length=120)
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)


class SupportFile(models.Model):
    conversation = models.ForeignKey(SupportConversation, on_delete=models.CASCADE, related_name='files')
    message = models.ForeignKey(SupportMessage, null=True, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=180)
    mime_type = models.CharField(max_length=80)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    content = models.BinaryField(default=bytes, blank=True)
    zoho = models.JSONField(default=dict, blank=True)
    document_source = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class WhatsAppConnection(models.Model):
    """Singleton. Credentials are encrypted and never returned by settings reads."""

    details = models.JSONField(default=dict)
    credentials = models.TextField(blank=True)
    enabled = models.BooleanField(default=False)
    tested_at = models.DateTimeField(null=True, blank=True)
    webhook_verified_at = models.DateTimeField(null=True, blank=True)
    last_received_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


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
    ACTION_RECEPTION_FOLLOW_UP = "reception_follow_up"
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
        (ACTION_RECEPTION_FOLLOW_UP, "Seguimento da Recepção actualizado"),
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
