from decimal import Decimal

from django.contrib.auth.models import User
from django.db import models

from apps.orders.models import Order


class Payment(models.Model):
    METHOD_CASH = "cash"
    METHOD_BANK_TRANSFER = "bank_transfer"
    METHOD_MPESA = "mpesa"
    METHOD_EMOLA = "emola"
    METHOD_OTHER = "other"
    METHOD_CHOICES = [
        (METHOD_CASH, "Dinheiro"),
        (METHOD_BANK_TRANSFER, "Transferência bancária"),
        (METHOD_MPESA, "M-Pesa"),
        (METHOD_EMOLA, "E-Mola"),
        (METHOD_OTHER, "Outro"),
    ]

    STATUS_PENDING = "pending"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_REFUNDED = "refunded"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendente"),
        (STATUS_COMPLETED, "Concluído"),
        (STATUS_FAILED, "Falhado"),
        (STATUS_REFUNDED, "Reembolsado"),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="encomenda",
    )
    amount = models.DecimalField("valor", max_digits=12, decimal_places=2)
    method = models.CharField(
        "método", max_length=30, choices=METHOD_CHOICES, default=METHOD_CASH
    )
    reference_code = models.CharField(
        "referência / transação", max_length=100, blank=True
    )
    status = models.CharField(
        "estado", max_length=20, choices=STATUS_CHOICES, default=STATUS_COMPLETED
    )
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="recorded_payments",
        null=True,
        blank=True,
        verbose_name="registado por",
    )
    notes = models.TextField("observações", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "pagamento"
        verbose_name_plural = "pagamentos"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.amount} MZN ({self.get_method_display()}) — {self.order.reference}"

    def save(self, *args, **kwargs):
        if self.amount is None:
            self.amount = Decimal("0")
        super().save(*args, **kwargs)
