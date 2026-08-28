from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.catalog.models import Product, ProductVariant


class QuoteRequest(models.Model):
    STATUS_RECEIVED = "received"
    STATUS_REVIEWING = "reviewing"
    STATUS_QUOTED = "quoted"
    STATUS_APPROVED = "approved"
    STATUS_IN_PRODUCTION = "in_production"
    STATUS_READY = "ready"
    STATUS_DELIVERED = "delivered"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_RECEIVED, "Pedido recebido"),
        (STATUS_REVIEWING, "Em análise"),
        (STATUS_QUOTED, "Orçamentado"),
        (STATUS_APPROVED, "Aprovado"),
        (STATUS_IN_PRODUCTION, "Em produção"),
        (STATUS_READY, "Pronto para entrega"),
        (STATUS_DELIVERED, "Entregue"),
        (STATUS_CANCELLED, "Cancelado"),
    ]

    URGENCY_NORMAL = "normal"
    URGENCY_URGENT = "urgent"
    URGENCY_CHOICES = [
        (URGENCY_NORMAL, "Normal"),
        (URGENCY_URGENT, "Urgente"),
    ]

    PAYMENT_DEPOSIT_50 = "deposit_50"
    PAYMENT_ON_DELIVERY = "on_delivery"
    PAYMENT_OPTION_CHOICES = [
        (PAYMENT_DEPOSIT_50, "50% adiantado + 50% na entrega"),
        (PAYMENT_ON_DELIVERY, "100% na entrega"),
    ]

    reference = models.CharField(
        "referência", max_length=20, unique=True, blank=True, db_index=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="quotes",
        null=True,
        blank=True,
        verbose_name="utilizador",
    )

    client_name = models.CharField("nome do cliente", max_length=255)
    client_email = models.EmailField("email do cliente")
    client_phone = models.CharField("telefone do cliente", max_length=50, blank=True)
    client_company = models.CharField("empresa", max_length=255, blank=True)

    urgency = models.CharField(
        "urgência", max_length=20, choices=URGENCY_CHOICES, default=URGENCY_NORMAL
    )
    notes = models.TextField("observações gerais", blank=True)

    status = models.CharField(
        "estado", max_length=30, choices=STATUS_CHOICES, default=STATUS_RECEIVED
    )

    # Provenance of the client's price approval. Conversion to an order is
    # only allowed once these are set (via the approve-price endpoint or a
    # staff member recording approval on the client's behalf).
    price_approved_at = models.DateTimeField("preço aprovado em", null=True, blank=True)
    price_approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_approvals",
        verbose_name="preço aprovado por",
    )
    price_approval_comment = models.TextField(
        "comentário da aprovação de preço", blank=True
    )
    valid_until = models.DateField("proposta válida até", null=True, blank=True)
    terms = models.TextField("condições da proposta", blank=True)
    estimated_delivery_days = models.PositiveSmallIntegerField(
        "prazo estimado de entrega (dias úteis)",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
    )
    payment_option = models.CharField(
        "condição de pagamento",
        max_length=20,
        choices=PAYMENT_OPTION_CHOICES,
        default=PAYMENT_DEPOSIT_50,
    )

    # Server-side guard rails for the commercial workflow.
    ALLOWED_TRANSITIONS = {
        STATUS_RECEIVED: {STATUS_REVIEWING, STATUS_CANCELLED},
        STATUS_REVIEWING: {STATUS_RECEIVED, STATUS_QUOTED, STATUS_CANCELLED},
        STATUS_QUOTED: {STATUS_REVIEWING, STATUS_APPROVED, STATUS_CANCELLED},
        STATUS_APPROVED: {STATUS_CANCELLED},
        STATUS_IN_PRODUCTION: {STATUS_READY, STATUS_CANCELLED},
        STATUS_READY: {STATUS_IN_PRODUCTION, STATUS_DELIVERED, STATUS_CANCELLED},
        STATUS_DELIVERED: set(),
        STATUS_CANCELLED: {STATUS_RECEIVED},
    }

    def can_transition_to(self, new_status: str) -> bool:
        return new_status == self.status or new_status in self.ALLOWED_TRANSITIONS.get(
            self.status, set()
        )

    internal_notes = models.TextField("notas internas", blank=True)
    estimated_price = models.DecimalField(
        "preço estimado", max_digits=12, decimal_places=2, null=True, blank=True
    )
    final_price = models.DecimalField(
        "preço final", max_digits=12, decimal_places=2, null=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "pedido de orçamento"
        verbose_name_plural = "pedidos de orçamento"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.reference or 'Sem referência'} — {self.client_name}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._generate_reference()
        super().save(*args, **kwargs)

    def _generate_reference(self):
        year = self.created_at.year if self.created_at else self._now().year
        from django.db.models import Q

        references = QuoteRequest.objects.filter(
            Q(reference__endswith=f"-{year}")
            | Q(reference__startswith=f"MP-{year}-")
        ).values_list("reference", flat=True)
        sequences = []
        for reference in references:
            parts = reference.split("-")
            if len(parts) != 3 or parts[0] != "MP":
                continue
            try:
                if parts[2] == str(year):
                    sequences.append(int(parts[1]))
                elif parts[1] == str(year):
                    sequences.append(int(parts[2]))
            except ValueError:
                continue

        return f"MP-{max(sequences, default=0) + 1:04d}-{year}"

    def _now(self):
        from django.utils import timezone

        return timezone.now()


class QuoteItem(models.Model):
    quote = models.ForeignKey(
        QuoteRequest,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="orçamento",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        related_name="quote_items",
        null=True,
        blank=True,
        verbose_name="produto",
    )
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        related_name="quote_items",
        null=True,
        blank=True,
        verbose_name="variante",
    )
    description = models.CharField("descrição", max_length=255, blank=True)
    quantity = models.PositiveIntegerField("quantidade", default=1)
    size = models.CharField("tamanho", max_length=100, blank=True)
    material = models.CharField("material", max_length=100, blank=True)
    colors = models.CharField("cores", max_length=100, blank=True)
    needs_design = models.BooleanField("necessita de design", default=False)
    artwork_file = models.FileField(
        "ficheiro de arte", upload_to="uploads/quote_item_files/", blank=True, null=True
    )
    notes = models.TextField("observações", blank=True)
    unit_price = models.DecimalField(
        "preço unitário", max_digits=12, decimal_places=2, null=True, blank=True
    )
    position = models.PositiveSmallIntegerField("ordem", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "item do orçamento"
        verbose_name_plural = "itens do orçamento"
        ordering = ["position", "id"]

    def __str__(self):
        return f"{self.description or 'Item'} × {self.quantity}"


class ArtworkProofVersion(models.Model):
    """One uploaded proof per row, so the full revision history is kept."""

    DECISION_PENDING = "pending"
    DECISION_APPROVED = "approved"
    DECISION_CHANGES_REQUESTED = "changes_requested"
    DECISION_CHOICES = [
        (DECISION_PENDING, "Pendente"),
        (DECISION_APPROVED, "Aprovada"),
        (DECISION_CHANGES_REQUESTED, "Alterações solicitadas"),
    ]

    quote = models.ForeignKey(
        QuoteRequest,
        on_delete=models.CASCADE,
        related_name="proof_versions",
        verbose_name="orçamento",
    )
    version = models.PositiveIntegerField("versão")
    file = models.FileField("ficheiro da prova", upload_to="uploads/artwork_proofs/")
    designer_comment = models.TextField("comentário do designer", blank=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_proofs",
        verbose_name="carregado por",
    )
    client_decision = models.CharField(
        "decisão do cliente",
        max_length=30,
        choices=DECISION_CHOICES,
        default=DECISION_PENDING,
    )
    client_comment = models.TextField("comentário do cliente", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "versão de prova"
        verbose_name_plural = "versões de prova"
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(fields=["quote", "version"], name="unique_proof_version")
        ]

    def __str__(self):
        return f"{self.quote.reference} — v{self.version}"


class ArtworkApproval(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_CHANGES_REQUESTED = "changes_requested"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendente"),
        (STATUS_APPROVED, "Aprovada"),
        (STATUS_CHANGES_REQUESTED, "Alterações solicitadas"),
    ]

    quote = models.OneToOneField(
        QuoteRequest,
        on_delete=models.CASCADE,
        related_name="artwork",
        verbose_name="orçamento",
    )
    status = models.CharField(
        "estado", max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    proof_file = models.FileField(
        "prova de arte", upload_to="uploads/artwork_proofs/", blank=True, null=True
    )
    designer_comment = models.TextField("comentário do designer", blank=True)
    client_comment = models.TextField("comentário do cliente", blank=True)
    requested_changes = models.TextField("alterações solicitadas", blank=True)
    approved_at = models.DateTimeField("aprovado em", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "aprovação de arte"
        verbose_name_plural = "aprovações de arte"

    def __str__(self):
        return f"Arte — {self.quote.reference} ({self.get_status_display()})"
