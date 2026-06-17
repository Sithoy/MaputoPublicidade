from django.contrib.auth.models import User
from django.db import models

from apps.catalog.models import Product


class QuoteRequest(models.Model):
    STATUS_RECEIVED = "received"
    STATUS_REVIEWING = "reviewing"
    STATUS_AWAITING_APPROVAL = "awaiting_approval"
    STATUS_APPROVED = "approved"
    STATUS_IN_PRODUCTION = "in_production"
    STATUS_READY = "ready"
    STATUS_DELIVERED = "delivered"
    STATUS_CHOICES = [
        (STATUS_RECEIVED, "Recebido"),
        (STATUS_REVIEWING, "Em revisão"),
        (STATUS_AWAITING_APPROVAL, "Aguardando aprovação"),
        (STATUS_APPROVED, "Aprovada para produção"),
        (STATUS_IN_PRODUCTION, "Em produção"),
        (STATUS_READY, "Pronto para levantamento"),
        (STATUS_DELIVERED, "Entregue"),
    ]

    URGENCY_NORMAL = "normal"
    URGENCY_URGENT = "urgent"
    URGENCY_CHOICES = [
        (URGENCY_NORMAL, "Normal"),
        (URGENCY_URGENT, "Urgente"),
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

    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        related_name="quotes",
        null=True,
        blank=True,
        verbose_name="produto",
    )
    quantity = models.PositiveIntegerField("quantidade", default=1)
    size = models.CharField("tamanho", max_length=100, blank=True)
    material = models.CharField("material", max_length=100, blank=True)
    colors = models.CharField("cores", max_length=100, blank=True)
    needs_design = models.BooleanField("necessita de design", default=False)
    urgency = models.CharField(
        "urgência", max_length=20, choices=URGENCY_CHOICES, default=URGENCY_NORMAL
    )
    notes = models.TextField("observações", blank=True)
    file = models.FileField(
        "ficheiro anexo", upload_to="uploads/quote_files/", blank=True, null=True
    )

    status = models.CharField(
        "estado", max_length=30, choices=STATUS_CHOICES, default=STATUS_RECEIVED
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

    def __str__(self):
        return f"{self.reference or 'Sem referência'} — {self.client_name}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._generate_reference()
        super().save(*args, **kwargs)

    def _generate_reference(self):
        from django.db.models import Max

        year = self.created_at.year if self.created_at else self._now().year
        prefix = f"MP-{year}-"
        latest = (
            QuoteRequest.objects.filter(reference__startswith=prefix)
            .aggregate(max_ref=Max("reference"))
            .get("max_ref")
        )
        if latest:
            try:
                seq = int(latest.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"

    def _now(self):
        from django.utils import timezone

        return timezone.now()


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
