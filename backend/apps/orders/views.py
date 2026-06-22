from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsOwnerOrStaff, IsStaffUser

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
        ]:
            return [IsStaffUser()]
        return [IsAuthenticated(), IsOwnerOrStaff(owner_field="user")]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_staff:
            return self.queryset
        return self.queryset.filter(user=user)

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, reference=None):
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
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
