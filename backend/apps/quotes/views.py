import os

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.export_utils import export_response
from apps.core.notifications import (
    notify_artwork_proof_uploaded,
    notify_order_created,
    notify_quote_received,
    notify_quote_ready,
    notify_quote_status_changed,
)
from apps.core.permissions import IsOwnerOrStaff, IsStaffUser
from apps.orders.models import Order, OrderItem

from .models import ArtworkApproval, QuoteRequest
from .serializers import (
    ArtworkApprovalSerializer,
    ArtworkProofSerializer,
    QuoteApprovalSerializer,
    QuoteChangeRequestSerializer,
    QuotePriceSerializer,
    QuoteRequestCreateSerializer,
    QuoteRequestDetailSerializer,
    QuoteRequestListSerializer,
    QuoteRequestUpdateSerializer,
    QuoteStatusSerializer,
)


class QuoteRequestViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = (
        QuoteRequest.objects.all()
        .select_related("artwork", "user")
        .prefetch_related("items", "items__product", "items__product_variant")
    )
    lookup_field = "reference"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_serializer_class(self):
        if self.action == "create":
            return QuoteRequestCreateSerializer
        if self.action == "partial_update":
            return QuoteRequestUpdateSerializer
        if self.action in ["retrieve", "approve", "request_change"]:
            return QuoteRequestDetailSerializer
        return QuoteRequestListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        if self.action in [
            "set_status",
            "set_price",
            "upload_proof",
            "convert_to_order",
            "update",
            "partial_update",
            "destroy",
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
        urgency_filter = request.query_params.get("urgency")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if urgency_filter:
            queryset = queryset.filter(urgency=urgency_filter)
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        field_map = {
            "Referencia": "reference",
            "Data": lambda obj: obj.created_at.strftime("%Y-%m-%d %H:%M"),
            "Cliente": "client_name",
            "Email": "client_email",
            "Telefone": "client_phone",
            "Empresa": "client_company",
            "Estado": lambda obj: obj.get_status_display(),
            "Urgencia": lambda obj: obj.get_urgency_display(),
            "Preco estimado": "estimated_price",
            "Preco final": "final_price",
            "Itens": lambda obj: "; ".join(f"{i.description} x{i.quantity}" for i in obj.items.all()),
            "Encomenda": lambda obj: obj.order.reference if hasattr(obj, "order") and obj.order else "",
            "Notas": "notes",
        }

        return export_response(queryset, field_map, "orcamentos", fmt)

    def create(self, request, *args, **kwargs):
        serializer = QuoteRequestCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        notify_quote_received(quote)
        detail = QuoteRequestDetailSerializer(quote, context={"request": request})
        return Response(detail.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, reference=None):
        quote = self.get_object()
        serializer = QuoteStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = quote.status
        new_status = serializer.validated_data["status"]
        quote.status = new_status
        quote.save(update_fields=["status", "updated_at"])
        notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Estado actualizado.",
                "status": new_status,
                "status_display": quote.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="set-price")
    def set_price(self, request, reference=None):
        quote = self.get_object()
        serializer = QuotePriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if "estimated_price" in serializer.validated_data:
            quote.estimated_price = serializer.validated_data["estimated_price"]
        if "final_price" in serializer.validated_data:
            quote.final_price = serializer.validated_data["final_price"]
        quote.save(update_fields=["estimated_price", "final_price", "updated_at"])

        old_status = quote.status
        if quote.final_price and quote.status in (
            QuoteRequest.STATUS_RECEIVED,
            QuoteRequest.STATUS_REVIEWING,
        ):
            quote.status = QuoteRequest.STATUS_QUOTED
            quote.save(update_fields=["status", "updated_at"])
            notify_quote_ready(quote)
        elif old_status != quote.status:
            notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Preços actualizados.",
                "estimated_price": quote.estimated_price,
                "final_price": quote.final_price,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="upload-proof")
    def upload_proof(self, request, reference=None):
        quote = self.get_object()
        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)

        serializer = ArtworkProofSerializer(artwork, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status=ArtworkApproval.STATUS_PENDING)

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_QUOTED
        quote.save(update_fields=["status", "updated_at"])
        notify_artwork_proof_uploaded(quote)
        if old_status != quote.status:
            notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Prova de arte enviada.",
                "artwork": ArtworkApprovalSerializer(artwork).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, reference=None):
        quote = self.get_object()
        serializer = QuoteApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)
        artwork.status = ArtworkApproval.STATUS_APPROVED
        artwork.client_comment = serializer.validated_data.get("comment", "")
        artwork.approved_at = timezone.now()
        artwork.save()

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.save()
        notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Arte aprovada com sucesso.",
                "artwork": ArtworkApprovalSerializer(artwork).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="request-change")
    def request_change(self, request, reference=None):
        quote = self.get_object()
        serializer = QuoteChangeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)
        artwork.status = ArtworkApproval.STATUS_CHANGES_REQUESTED
        artwork.requested_changes = serializer.validated_data.get("comment", "")
        artwork.save()

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_REVIEWING
        quote.save()
        notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Pedido de alteração registado.",
                "artwork": ArtworkApprovalSerializer(artwork).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="approve-price")
    def approve_price(self, request, reference=None):
        quote = self.get_object()
        if quote.status != QuoteRequest.STATUS_QUOTED:
            return Response(
                {"detail": "Apenas orçamentos no estado 'Orçamentado' podem ser aprovados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.save(update_fields=["status", "updated_at"])
        notify_quote_status_changed(quote, old_status)
        return Response(
            {
                "detail": "Preço aprovado.",
                "status": quote.status,
                "status_display": quote.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="convert-to-order")
    def convert_to_order(self, request, reference=None):
        quote = self.get_object()
        if hasattr(quote, "order"):
            return Response(
                {
                    "detail": "Este orçamento já foi convertido numa encomenda.",
                    "order_reference": quote.order.reference,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.create(
            user=quote.user,
            quote=quote,
            estimated_price=quote.estimated_price,
            final_price=quote.final_price,
            status=Order.STATUS_APPROVED,
            delivery_address=getattr(getattr(quote.user, "profile", None), "address", ""),
        )

        for idx, quote_item in enumerate(quote.items.all()):
            order_item = OrderItem.objects.create(
                order=order,
                product=quote_item.product,
                product_variant=quote_item.product_variant,
                description=quote_item.description,
                quantity=quote_item.quantity,
                size=quote_item.size,
                material=quote_item.material,
                colors=quote_item.colors,
                needs_design=quote_item.needs_design,
                notes=quote_item.notes,
                unit_price=quote_item.unit_price,
                position=idx,
            )
            if quote_item.artwork_file:
                filename = os.path.basename(quote_item.artwork_file.name)
                order_item.artwork_file.save(filename, quote_item.artwork_file, save=True)

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.save(update_fields=["status", "updated_at"])

        notify_quote_status_changed(quote, old_status)
        notify_order_created(order)

        from .serializers import QuoteRequestDetailSerializer

        return Response(
            {
                "detail": "Orçamento convertido em encomenda.",
                "order_reference": order.reference,
                "quote": QuoteRequestDetailSerializer(quote, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
