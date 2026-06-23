from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order

from .models import Payment
from .providers import get_provider
from .serializers import (
    PaymentInitiateSerializer,
    PaymentSerializer,
)
from .webhook_security import verify_webhook_signature


def _can_access_order(request, order: Order) -> bool:
    if request.user.is_staff:
        return True
    return order.user == request.user


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list/retrieve plus payment initiation for the authenticated user."""

    lookup_field = "correlation_id"
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(order__user=user)

    @action(detail=False, methods=["post"], url_path="initiate")
    def initiate(self, request):
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order = get_object_or_404(Order, reference=data["order_reference"])
        if not _can_access_order(request, order):
            return Response(
                {"detail": "Não tem permissão para pagar esta encomenda."},
                status=status.HTTP_403_FORBIDDEN,
            )

        amount = data.get("amount") or order.amount_due or order.final_price
        if amount is None or amount <= 0:
            return Response(
                {
                    "detail": "Não foi possível determinar o valor a pagar."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment(
            order=order,
            amount=amount,
            method=data["method"],
            phone_number=data["phone_number"],
            status=Payment.STATUS_PENDING,
            recorded_by=request.user if request.user.is_staff else None,
        )

        provider = get_provider()
        try:
            result = provider.initiate(payment)
        except Exception as exc:
            payment.provider = getattr(provider, "name", "unknown")
            payment.provider_payload = {"error": str(exc)}
            payment.status = Payment.STATUS_FAILED
            payment.save()
            return Response(
                {"detail": str(exc), "payment": PaymentSerializer(payment).data},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.save()
        output = PaymentSerializer(payment)
        return Response(
            {"provider_response": result, "payment": output.data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="status")
    def status(self, request, correlation_id=None):
        payment = self.get_object()
        provider = get_provider()

        if (
            payment.status == Payment.STATUS_PENDING
            and payment.provider == "mpesa"
            and hasattr(provider, "query_status")
        ):
            try:
                result = provider.query_status(payment)
                payment.provider_payload = result
                code = result.get("output_ResponseCode")
                if code == "INS-0":
                    payment.status = Payment.STATUS_COMPLETED
                    payment.provider_transaction_id = result.get(
                        "output_TransactionID", payment.provider_transaction_id
                    )
                    payment.reference_code = result.get(
                        "output_TransactionID", payment.reference_code
                    )
                elif code and code != "INS-0":
                    payment.status = Payment.STATUS_FAILED
                payment.save()
            except Exception as exc:
                return Response(
                    {"detail": f"Erro ao consultar estado: {exc}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response(PaymentSerializer(payment).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def mpesa_webhook(request):
    if not verify_webhook_signature(request):
        return Response(
            {"detail": "Assinatura webhook inválida."},
            status=status.HTTP_403_FORBIDDEN,
        )

    provider = get_provider()
    update = provider.handle_webhook(request.data)
    if not update:
        return Response({"detail": "No update"}, status=status.HTTP_200_OK)

    payment = _update_payment_from_webhook(update)
    if not payment:
        return Response(
            {"detail": "Pagamento não encontrado."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response({"detail": "Actualizado.", "status": payment.status})


@api_view(["POST"])
@permission_classes([AllowAny])
def emola_webhook(request):
    if not verify_webhook_signature(request):
        return Response(
            {"detail": "Assinatura webhook inválida."},
            status=status.HTTP_403_FORBIDDEN,
        )

    from .providers.emola import EmolaProvider

    provider = EmolaProvider()
    update = provider.handle_webhook(request.data)
    if not update:
        return Response({"detail": "No update"}, status=status.HTTP_200_OK)

    payment = _update_payment_from_webhook(update)
    if not payment:
        return Response(
            {"detail": "Pagamento não encontrado."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response({"detail": "Actualizado.", "status": payment.status})


def _update_payment_from_webhook(update: dict):
    payment = None
    tx_id = update.get("provider_transaction_id")
    correlation = update.get("correlation_id")

    if tx_id:
        payment = Payment.objects.filter(provider_transaction_id=tx_id).first()
    if not payment and correlation:
        payment = Payment.objects.filter(correlation_id=correlation).first()
    if not payment:
        return None

    payment.status = update["status"]
    payment.provider_payload = update.get("provider_payload", payment.provider_payload)
    if update.get("reference_code"):
        payment.reference_code = update["reference_code"]
    if update.get("provider_transaction_id"):
        payment.provider_transaction_id = update["provider_transaction_id"]
    payment.save()
    return payment
