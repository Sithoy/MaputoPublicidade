from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.core.activity import record_activity
from apps.core.export_utils import export_response
from apps.core.models import ActivityEvent
from apps.core.notifications import notify_order_status_changed
from apps.core.permissions import HasStaffCapability, IsOwnerOrStaff
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
        .select_related("user", "user__profile", "quote", "quote__artwork", "invoice")
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
        if self.action in ["create", "update", "partial_update"]:
            return [HasStaffCapability(StaffCapability.MANAGE_ORDERS)]
        if self.action == "set_status":
            return [HasStaffCapability(StaffCapability.MANAGE_ORDER_STATUS)]
        if self.action == "set_payment":
            return [HasStaffCapability(StaffCapability.MANAGE_PAYMENTS)]
        if self.action == "export":
            return [HasStaffCapability(StaffCapability.EXPORT_ORDERS)]
        return [
            IsAuthenticated(),
            IsOwnerOrStaff(
                owner_field="user",
                staff_capability=StaffCapability.VIEW_ORDERS,
            ),
        ]

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
            "Cliente": lambda obj: obj.client_name_display,
            "Email": lambda obj: obj.client_email_display,
            "Telefone": lambda obj: obj.client_phone_display,
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
        if (
            new_status == Order.STATUS_CANCELLED
            and not has_staff_capability(
                request.user, StaffCapability.MANAGE_ORDERS
            )
        ):
            return Response(
                {"detail": "A sua função não tem permissão para cancelar encomendas."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not order.can_transition_to(new_status):
            return Response(
                {
                    "detail": (
                        f"Transição inválida: de '{order.get_status_display()}' "
                        "não é possível avançar para o estado escolhido."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        record_activity(
            action=ActivityEvent.ACTION_STATUS_CHANGED,
            order=order,
            actor=request.user,
            from_status=old_status,
            to_status=new_status,
        )
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
        old_payment_status = order.payment_status
        order.payment_status = serializer.validated_data["payment_status"]
        if "amount_paid" in serializer.validated_data:
            order.amount_paid = serializer.validated_data["amount_paid"]
        order.save(update_fields=["payment_status", "amount_paid", "updated_at"])
        record_activity(
            action=ActivityEvent.ACTION_PAYMENT_STATUS_CHANGED,
            order=order,
            actor=request.user,
            from_status=old_payment_status,
            to_status=order.payment_status,
        )
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

        if not (
            request.user.is_staff
            and has_staff_capability(
                request.user, StaffCapability.MANAGE_PAYMENTS
            )
        ):
            return Response(
                {"detail": "Apenas staff pode registar pagamentos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PaymentCreateSerializer(data=request.data, context={"order": order})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(order=order, recorded_by=request.user)
        record_activity(
            action=ActivityEvent.ACTION_PAYMENT_RECORDED,
            order=order,
            actor=request.user,
            comment=f"{payment.amount} MZN via {payment.get_method_display()}",
        )
        output = PaymentSerializer(payment)
        return Response(output.data, status=status.HTTP_201_CREATED)
