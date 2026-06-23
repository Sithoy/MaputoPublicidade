from decimal import Decimal

from django.db import models
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.orders.models import Order

from .models import Payment


def _recalculate_order_payment(order: Order):
    completed = order.payments.filter(status=Payment.STATUS_COMPLETED)
    total = completed.aggregate(total=models.Sum("amount"))["total"] or Decimal("0")
    order.amount_paid = total

    if order.final_price is None or order.final_price <= 0:
        order.payment_status = Order.PAYMENT_PENDING
    elif total >= order.final_price:
        order.payment_status = Order.PAYMENT_PAID
    elif total > 0:
        order.payment_status = Order.PAYMENT_PARTIAL
    else:
        order.payment_status = Order.PAYMENT_PENDING

    order.save(update_fields=["amount_paid", "payment_status", "updated_at"])


@receiver(post_save, sender=Payment)
def payment_post_save(sender, instance, created, **kwargs):
    _recalculate_order_payment(instance.order)


@receiver(post_delete, sender=Payment)
def payment_post_delete(sender, instance, **kwargs):
    _recalculate_order_payment(instance.order)
