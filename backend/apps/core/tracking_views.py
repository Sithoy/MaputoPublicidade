"""Guest tracking is a scoped capability, never a public quote serializer."""

import logging

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.quotes.models import QuoteRequest

from .models import SupportConversation, SupportMessage

SALT = "mp-request-tracking-v1"
MAX_AGE = 7 * 24 * 3600
logger = logging.getLogger(__name__)


def contact_key(quote):
    return salted_hmac(SALT, quote.client_email.strip().lower()).hexdigest()


def tracking_token(quote):
    return signing.dumps({"quote": quote.pk, "contact": contact_key(quote)}, salt=SALT)


def tracking_link(quote):
    origin = getattr(settings, "TRACKING_SITE_URL", "https://maputopublicidade.com").rstrip("/")
    return f"{origin}/acompanhar#token={tracking_token(quote)}"


def email_tracking_link(quote):
    try:
        send_mail(
            f"Maputo Publicidade — Acompanhar pedido {quote.reference}",
            f"Acompanhe o pedido {quote.reference} e fale com a Recepção:\n\n{tracking_link(quote)}\n\n"
            "Este link é pessoal e válido por 7 dias. Não o partilhe. Pode pedir outro no site.",
            settings.DEFAULT_FROM_EMAIL, [quote.client_email], fail_silently=False,
        )
    except Exception:
        logger.warning("Não foi possível enviar o email de acompanhamento.")


class TrackingReadThrottle(AnonRateThrottle):
    scope = "tracking_read"
    rate = "60/min"


class TrackingWriteThrottle(AnonRateThrottle):
    scope = "tracking_write"
    rate = "10/min"


class TrackingLookupThrottle(AnonRateThrottle):
    scope = "tracking_lookup"
    rate = "5/hour"


class LookupInput(serializers.Serializer):
    reference = serializers.CharField(max_length=30)
    email = serializers.EmailField(max_length=254)


class TrackingAPIView(APIView):
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store, private"
        response["Referrer-Policy"] = "no-referrer"
        return response


class TrackingLookup(TrackingAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [TrackingLookupThrottle]

    def post(self, request):
        data = LookupInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        quote = QuoteRequest.objects.filter(
            reference__iexact=values["reference"].strip(), client_email__iexact=values["email"].strip(),
        ).first()
        if quote and cache.add(f"tracking-mail:{quote.pk}", True, timeout=300):
            email_tracking_link(quote)
        # Identical response for absent references, incorrect emails and email failures.
        response = Response({"detail": "Se os dados corresponderem a um pedido, receberá um link no email indicado."})
        response["Cache-Control"] = "no-store"
        return response


def authorized_quote(request):
    token = request.headers.get("X-MP-Tracking-Token", "")
    if len(token) > 1024:
        raise PermissionDenied("Link inválido ou expirado. Solicite um novo link.")
    try:
        values = signing.loads(token, salt=SALT, max_age=MAX_AGE)
        if not isinstance(values, dict):
            raise ValueError
        quote = QuoteRequest.objects.select_related("order").prefetch_related("items").get(pk=values["quote"])
        if not constant_time_compare(str(values.get("contact", "")), contact_key(quote)):
            raise ValueError
        return quote
    except (signing.BadSignature, QuoteRequest.DoesNotExist, KeyError, ValueError, TypeError):
        raise PermissionDenied("Link inválido ou expirado. Solicite um novo link.") from None


def public_status(quote):
    order = getattr(quote, "order", None)
    if quote.status == "cancelled" or (order and order.status == "cancelled"):
        return None, "Pedido cancelado", "Fale com a Recepção se precisar de esclarecimentos."
    if quote.status == "delivered":
        return 5, "Entregue", "O trabalho foi entregue. Obrigado pela confiança."
    if order:
        if order.status == "delivered":
            return 5, "Entregue", "O trabalho foi entregue. Obrigado pela confiança."
        if order.status == "ready":
            return 4, "Pronto", "Fale com a Recepção para confirmar a entrega ou o levantamento."
        if order.status == "in_production":
            return 3, "Em produção", "A equipa está a executar o seu trabalho."
        return 2, "Preparação do trabalho", "O pedido está a ser preparado; a produção ainda não começou."
    if quote.price_approved_at:
        return 2, "Proposta aceite", "A MP está a preparar a ordem de trabalho."
    if quote.proposal_stage == "sent" or (quote.proposal_stage == "legacy" and quote.status == "quoted"):
        return 2, "Proposta enviada", "Aguardamos a sua decisão. Fale com a Recepção sobre a proposta."
    if quote.status != "received" or quote.reception_completed_at or quote.proposal_stage != "draft":
        return 1, "Em análise", "A Recepção está a analisar o pedido e a preparar os próximos passos."
    return 0, "Pedido recebido", "Vamos analisar o seu pedido. Ainda não é uma ordem de produção."


def tracking_data(quote):
    step, label, next_action = public_status(quote)
    order = getattr(quote, "order", None)
    # This whitelist deliberately excludes prices, staff, internal history, files and notes.
    return {
        "reference": quote.reference, "order_reference": order.reference if order else None,
        "title": quote.items.first().description if quote.items.exists() else "Pedido à Maputo Publicidade",
        "created_at": quote.created_at, "step": step, "status": label, "next_action": next_action,
        "scheduled_date": order.scheduled_date if order else None,
    }


class TrackingDetail(TrackingAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [TrackingReadThrottle]

    def get(self, request):
        response = Response(tracking_data(authorized_quote(request)))
        response["Cache-Control"] = "no-store, private"
        return response


class TrackingMessageInput(serializers.Serializer):
    body = serializers.CharField(max_length=4000)


class TrackingMessages(TrackingDetail):
    def get_throttles(self):
        return [TrackingReadThrottle()] if self.request.method == "GET" else [TrackingWriteThrottle()]

    def get(self, request):
        quote = authorized_quote(request)
        conversation = SupportConversation.objects.filter(quote=quote, channel="tracking").first()
        messages = list(conversation.messages.order_by("-id").values("id", "body", "is_staff", "created_at")[:100]) if conversation else []
        response = Response({"messages": messages[::-1]})
        response["Cache-Control"] = "no-store, private"
        return response

    @transaction.atomic
    def post(self, request):
        quote = authorized_quote(request)
        data = TrackingMessageInput(data=request.data)
        data.is_valid(raise_exception=True)
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        conversation = SupportConversation.objects.filter(quote=quote, channel="tracking").first()
        if not conversation:
            conversation = SupportConversation.objects.create(
                quote=quote, client=quote.user, channel="tracking", contact_name=quote.client_company or quote.client_name,
                subject=f"Acompanhamento · {quote.reference}",
            )
        message = SupportMessage.objects.create(conversation=conversation, body=data.validated_data["body"], source="tracking")
        conversation.status = "awaiting_team"
        conversation.last_inbound_at = timezone.now()
        conversation.save(update_fields=["status", "last_inbound_at", "updated_at"])
        from .support_views import notify_message

        notify_message(conversation, None)
        response = Response({"id": message.pk}, status=201)
        response["Cache-Control"] = "no-store, private"
        return response
