from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.export_utils import export_response
from apps.core.notifications import notify_order_status_changed
from apps.core.permissions import IsOwnerOrStaff, IsStaffUser
from apps.payments.models import Payment
from apps.payments.serializers import PaymentCreateSerializer, PaymentSerializer

from .models import Order
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderPaymentSerializer,
    OrderStatusSerializer,
    OrderUpdateSerializer,
)


class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = (
        Order.objects.all()
        .select_related("user", "user__profile", "quote", "quote__artwork")
        .prefetch_related("items", "items__product", "items__product_variant")
        .order_by("-created_at")
    )
    lookup_field = "reference"
    serializer_classes = {
        "create": OrderCreateSerializer,
        "update": OrderUpdateSerializer,
        "partial_update": OrderUpdateSerializer,
        "retrieve": OrderDetailSerializer,
        "list": OrderListSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(self.action, OrderListSerializer)

    def get_permissions(self):
        if self.action in [
            "create",
            "update",
            "partial_update",
            "set_status",
            "set_payment",
            "export",
        ]:
            return [IsStaffUser()]
        return [IsAuthenticated(), IsOwnerOrStaff(owner_field="user")]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_staff:
            return self.queryset
        return self.queryset.filter(user=user)

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        fmt = request.query_params.get("format", "csv")
        queryset = self.get_queryset()

        status_filter = request.query_params.get("status")
        payment_status_filter = request.query_params.get("payment_status")
        delivery_method = request.query_params.get("delivery_method")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if payment_status_filter:
            queryset = queryset.filter(payment_status=payment_status_filter)
        if delivery_method:
            queryset = queryset.filter(delivery_method=delivery_method)
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        field_map = {
            "Referencia": "reference",
            "Data": lambda obj: obj.created_at.strftime("%Y-%m-%d %H:%M"),
            "Cliente": lambda obj: obj.user.get_full_name() or obj.user.email,
            "Email": "user.email",
            "Telefone": lambda obj: getattr(obj.user.profile, "phone", "") if hasattr(obj.user, "profile") else "",
            "Orcamento": lambda obj: obj.quote.reference if obj.quote else "",
            "Estado": lambda obj: obj.get_status_display(),
            "Pagamento": lambda obj: obj.get_payment_status_display(),
            "Preco final": "final_price",
            "Valor pago": "amount_paid",
            "Em divida": lambda obj: obj.amount_due or 0,
            "Entrega": lambda obj: obj.get_delivery_method_display(),
            "Morada": "delivery_address",
            "Itens": lambda obj: "; ".join(f"{i.description} x{i.quantity}" for i in obj.items.all()),
            "Notas internas": "internal_notes",
        }

        return export_response(queryset, field_map, "encomendas", fmt)

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, reference=None):
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old_status = order.status
        new_status = serializer.validated_data["status"]
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        notify_order_status_changed(order, old_status)
        return Response(
            {
                "detail": "Estado actualizado.",
                "status": new_status,
                "status_display": order.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="set-payment")
    def set_payment(self, request, reference=None):
        order = self.get_object()
        serializer = OrderPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.payment_status = serializer.validated_data["payment_status"]
        if "amount_paid" in serializer.validated_data:
            order.amount_paid = serializer.validated_data["amount_paid"]
        order.save(update_fields=["payment_status", "amount_paid", "updated_at"])
        return Response(
            {
                "detail": "Pagamento actualizado.",
                "payment_status": order.payment_status,
                "payment_status_display": order.get_payment_status_display(),
                "amount_paid": order.amount_paid,
                "amount_due": order.amount_due,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "post"], url_path="payments")
    def payments(self, request, reference=None):
        order = self.get_object()
        if request.method == "GET":
            queryset = order.payments.all()
            serializer = PaymentSerializer(queryset, many=True)
            return Response(serializer.data)

        if not IsStaffUser().has_permission(request, self):
            return Response(
                {"detail": "Apenas staff pode registar pagamentos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(order=order, recorded_by=request.user)
        output = PaymentSerializer(payment)
        return Response(output.data, status=status.HTTP_201_CREATED)
