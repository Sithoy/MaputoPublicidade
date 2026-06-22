from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from apps.orders.models import Order
from apps.quotes.models import QuoteRequest


def _quote_recipients(quote: QuoteRequest):
    emails = set()
    if quote.client_email:
        emails.add(quote.client_email)
    if quote.user and quote.user.email:
        emails.add(quote.user.email)
    return list(emails)


def _order_recipients(order: Order):
    emails = set()
    if order.user and order.user.email:
        emails.add(order.user.email)
    return list(emails)


def _staff_email():
    return getattr(settings, "ADMIN_EMAIL", None) or settings.DEFAULT_FROM_EMAIL


def _send(template_name, subject, context, recipient_list, reply_to=None):
    if not recipient_list:
        return
    body = render_to_string(f"notifications/{template_name}.txt", context)
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_list,
        fail_silently=True,
    )


def notify_quote_received(quote: QuoteRequest):
    context = {"quote": quote}
    _send(
        "quote_received",
        f"Maputo Publicidade — Pedido de orçamento recebido ({quote.reference})",
        context,
        _quote_recipients(quote),
    )


def notify_quote_status_changed(quote: QuoteRequest, old_status: str):
    if quote.status == old_status:
        return
    status_map = dict(QuoteRequest.STATUS_CHOICES)
    context = {
        "quote": quote,
        "old_status": old_status,
        "old_status_display": status_map.get(old_status, old_status),
    }
    _send(
        "quote_status_changed",
        f"Maputo Publicidade — Actualização do orçamento {quote.reference}",
        context,
        _quote_recipients(quote),
    )


def notify_quote_ready(quote: QuoteRequest):
    context = {"quote": quote}
    _send(
        "quote_ready",
        f"Maputo Publicidade — Orçamento pronto ({quote.reference})",
        context,
        _quote_recipients(quote),
    )


def notify_artwork_proof_uploaded(quote: QuoteRequest):
    context = {"quote": quote}
    _send(
        "artwork_proof_uploaded",
        f"Maputo Publicidade — Prova de arte disponível ({quote.reference})",
        context,
        _quote_recipients(quote),
    )


def notify_order_created(order: Order):
    context = {"order": order}
    recipients = _order_recipients(order)
    _send(
        "order_created",
        f"Maputo Publicidade — Encomenda criada ({order.reference})",
        context,
        recipients,
    )
    # Staff copy
    _send(
        "order_created_staff",
        f"Maputo Publicidade — Nova encomenda {order.reference}",
        context,
        [_staff_email()],
    )


def notify_order_status_changed(order: Order, old_status: str):
    if order.status == old_status:
        return
    status_map = dict(Order.STATUS_CHOICES)
    context = {
        "order": order,
        "old_status": old_status,
        "old_status_display": status_map.get(old_status, old_status),
    }
    _send(
        "order_status_changed",
        f"Maputo Publicidade — Actualização da encomenda {order.reference}",
        context,
        _order_recipients(order),
    )
