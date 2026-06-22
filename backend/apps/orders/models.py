from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Order(models.Model):
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

    PAYMENT_PENDING = "pending"
    PAYMENT_PARTIAL = "partial"
    PAYMENT_PAID = "paid"
    PAYMENT_CHOICES = [
        (PAYMENT_PENDING, "Pendente"),
        (PAYMENT_PARTIAL, "Parcialmente pago"),
        (PAYMENT_PAID, "Pago"),
    ]

    DELIVERY_PICKUP = "pickup"
    DELIVERY_DELIVERY = "delivery"
    DELIVERY_CHOICES = [
        (DELIVERY_PICKUP, "Levantamento"),
        (DELIVERY_DELIVERY, "Entrega"),
    ]

    quote = models.OneToOneField(
        "quotes.QuoteRequest",
        on_delete=models.SET_NULL,
        related_name="order",
        null=True,
        blank=True,
        verbose_name="orçamento",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders",
        verbose_name="cliente",
    )
    reference = models.CharField(
        "referência", max_length=20, unique=True, blank=True, db_index=True
    )

    product_name = models.CharField("produto/serviço", max_length=255, blank=True)
    quantity = models.PositiveIntegerField("quantidade", default=1)
    size = models.CharField("tamanho", max_length=100, blank=True)
    material = models.CharField("material", max_length=100, blank=True)
    colors = models.CharField("cores", max_length=100, blank=True)
    needs_design = models.BooleanField("necessita de design", default=False)
    client_file = models.FileField(
        "ficheiro do cliente", upload_to="orders/files/", blank=True, null=True
    )

    final_price = models.DecimalField(
        "preço final", max_digits=12, decimal_places=2, null=True, blank=True
    )
    payment_status = models.CharField(
        "estado de pagamento",
        max_length=20,
        choices=PAYMENT_CHOICES,
        default=PAYMENT_PENDING,
    )
    amount_paid = models.DecimalField(
        "valor pago", max_digits=12, decimal_places=2, null=True, blank=True
    )

    status = models.CharField(
        "estado", max_length=30, choices=STATUS_CHOICES, default=STATUS_RECEIVED
    )
    delivery_method = models.CharField(
        "método de entrega",
        max_length=20,
        choices=DELIVERY_CHOICES,
        default=DELIVERY_PICKUP,
        blank=True,
    )
    delivery_address = models.TextField("morada de entrega", blank=True)
    internal_notes = models.TextField("notas internas", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "encomenda"
        verbose_name_plural = "encomendas"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference or 'Sem referência'} — {self.product_name or 'Encomenda'}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._generate_reference()
        super().save(*args, **kwargs)

    def _generate_reference(self):
        year = getattr(self, "created_at", None) and self.created_at.year
        if not year:
            year = timezone.now().year
        prefix = f"ENC-{year}-"
        latest = (
            Order.objects.filter(reference__startswith=prefix)
            .order_by("reference")
            .last()
        )
        if latest:
            try:
                seq = int(latest.reference.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"

    @property
    def amount_due(self):
        if self.final_price is None:
            return None
        paid = self.amount_paid or 0
        return max(self.final_price - paid, 0)
