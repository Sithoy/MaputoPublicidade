from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from apps.orders.models import Order
from apps.quotes.models import QuoteRequest

from .sms import send_sms


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
    if order.quote and order.quote.client_email:
        emails.add(order.quote.client_email)
    return list(emails)


def _staff_email():
    return getattr(settings, "ADMIN_EMAIL", None) or settings.DEFAULT_FROM_EMAIL


def _quote_phone(quote: QuoteRequest):
    if quote.client_phone:
        return quote.client_phone
    if quote.user and hasattr(quote.user, "profile") and quote.user.profile:
        return quote.user.profile.phone
    return None


def _order_phone(order: Order):
    if order.quote and order.quote.client_phone:
        return order.quote.client_phone
    if order.user and hasattr(order.user, "profile") and order.user.profile:
        return order.user.profile.phone
    return None


def _send_sms(phone, message):
    if phone:
        send_sms(phone, message)


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
    _send_sms(
        _quote_phone(quote),
        f"Obrigado pelo seu pedido de orçamento {quote.reference}. A Maputo Publicidade irá analisar e contacta-lo em breve.",
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
    _send_sms(
        _quote_phone(quote),
        f"O orcamento {quote.reference} esta pronto. Aceda a area de cliente para aprovar ou pedir alteracoes.",
    )


def notify_artwork_proof_uploaded(quote: QuoteRequest):
    context = {"quote": quote}
    _send(
        "artwork_proof_uploaded",
        f"Maputo Publicidade — Prova de arte disponível ({quote.reference})",
        context,
        _quote_recipients(quote),
    )
    _send_sms(
        _quote_phone(quote),
        f"Nova prova de arte disponivel para o orcamento {quote.reference}. Aceda a area de cliente para revisao.",
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
    _send_sms(
        _order_phone(order),
        f"A sua encomenda {order.reference} foi criada. Pode acompanhar o estado na area de cliente.",
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
    if order.status in (Order.STATUS_IN_PRODUCTION, Order.STATUS_READY, Order.STATUS_DELIVERED):
        _send_sms(
            _order_phone(order),
            f"Actualizacao da encomenda {order.reference}: {order.get_status_display()}.",
        )
