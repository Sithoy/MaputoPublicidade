from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db import models
from django.db.models import Max
from django.utils import timezone

from apps.orders.models import Order


def default_due_date():
    return timezone.localdate() + timedelta(days=15)


class Invoice(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_ISSUED = "issued"
    STATUS_PAID = "paid"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Rascunho"),
        (STATUS_ISSUED, "Emitida"),
        (STATUS_PAID, "Paga"),
        (STATUS_CANCELLED, "Anulada"),
    ]

    reference = models.CharField(
        "referência", max_length=24, unique=True, blank=True, db_index=True
    )
    order = models.OneToOneField(
        Order,
        on_delete=models.SET_NULL,
        related_name="invoice",
        null=True,
        blank=True,
        verbose_name="encomenda",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="invoices",
        null=True,
        blank=True,
        verbose_name="cliente",
    )
    client_name = models.CharField("nome do cliente", max_length=255)
    client_email = models.EmailField("e-mail do cliente", blank=True)
    client_phone = models.CharField("telefone do cliente", max_length=50, blank=True)
    client_company = models.CharField("empresa", max_length=255, blank=True)
    client_nuit = models.CharField("NUIT", max_length=50, blank=True)
    billing_address = models.TextField("morada de faturação", blank=True)

    issue_date = models.DateField("data de emissão", default=timezone.localdate)
    due_date = models.DateField("data de vencimento", default=default_due_date)
    status = models.CharField(
        "estado", max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    currency = models.CharField("moeda", max_length=3, default="MZN")
    subtotal = models.DecimalField(
        "subtotal", max_digits=12, decimal_places=2, default=Decimal("0")
    )
    discount_amount = models.DecimalField(
        "desconto", max_digits=12, decimal_places=2, default=Decimal("0")
    )
    tax_rate = models.DecimalField(
        "taxa de IVA (%)", max_digits=5, decimal_places=2, default=Decimal("0")
    )
    tax_amount = models.DecimalField(
        "IVA", max_digits=12, decimal_places=2, default=Decimal("0")
    )
    total = models.DecimalField(
        "total", max_digits=12, decimal_places=2, default=Decimal("0")
    )
    recorded_amount_paid = models.DecimalField(
        "valor pago registado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
    )
    notes = models.TextField("observações", blank=True)
    terms = models.TextField("condições", blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="created_invoices",
        null=True,
        blank=True,
        verbose_name="criada por",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "fatura"
        verbose_name_plural = "faturas"
        ordering = ["-issue_date", "-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["user", "-issue_date"]),
            models.Index(fields=["-issue_date"]),
        ]

    def __str__(self):
        return f"{self.reference or 'Sem referência'} — {self.client_name}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._generate_reference()
        super().save(*args, **kwargs)

    def _generate_reference(self):
        year = self.issue_date.year if self.issue_date else timezone.localdate().year
        prefix = f"FT-{year}-"
        latest = (
            Invoice.objects.filter(reference__startswith=prefix)
            .aggregate(max_ref=Max("reference"))
            .get("max_ref")
        )
        if latest:
            try:
                sequence = int(latest.rsplit("-", 1)[-1]) + 1
            except (TypeError, ValueError):
                sequence = 1
        else:
            sequence = 1
        return f"{prefix}{sequence:04d}"

    def recalculate_totals(self, *, save=True):
        subtotal = sum(
            (item.line_total for item in self.items.all()), Decimal("0")
        )
        taxable = max(subtotal - (self.discount_amount or Decimal("0")), Decimal("0"))
        tax_amount = (taxable * (self.tax_rate or Decimal("0")) / Decimal("100")).quantize(
            Decimal("0.01")
        )
        self.subtotal = subtotal
        self.tax_amount = tax_amount
        self.total = taxable + tax_amount
        if save:
            self.save(update_fields=["subtotal", "tax_amount", "total", "updated_at"])

    @property
    def amount_paid(self):
        order_amount = (
            self.order.amount_paid or Decimal("0") if self.order else Decimal("0")
        )
        return max(order_amount, self.recorded_amount_paid or Decimal("0"))

    @property
    def balance_due(self):
        return max(self.total - self.amount_paid, Decimal("0"))


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="fatura",
    )
    description = models.CharField("descrição", max_length=255)
    quantity = models.DecimalField(
        "quantidade", max_digits=10, decimal_places=2, default=Decimal("1")
    )
    unit_price = models.DecimalField(
        "preço unitário", max_digits=12, decimal_places=2
    )
    position = models.PositiveSmallIntegerField("ordem", default=0)

    class Meta:
        verbose_name = "item de fatura"
        verbose_name_plural = "itens de fatura"
        ordering = ["position", "id"]

    @property
    def line_total(self):
        return (self.quantity * self.unit_price).quantize(Decimal("0.01"))

    def __str__(self):
        return f"{self.description} x {self.quantity}"
