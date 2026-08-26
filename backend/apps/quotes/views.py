import os

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.roles import StaffCapability
from apps.core.activity import record_activity
from apps.core.export_utils import export_response
from apps.core.models import ActivityEvent
from apps.core.notifications import (
    notify_artwork_proof_uploaded,
    notify_order_created,
    notify_quote_ready,
    notify_quote_received,
    notify_quote_status_changed,
)
from apps.core.permissions import HasStaffCapability, IsOwnerOrStaff
from apps.orders.models import Order, OrderItem

from .models import ArtworkApproval, QuoteRequest
from .serializers import (
    ArtworkApprovalSerializer,
    ArtworkProofSerializer,
    ManualQuoteCreateSerializer,
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
        .select_related("artwork", "user", "price_approved_by")
        .prefetch_related("items", "items__product", "items__product_variant")
    )
    lookup_field = "reference"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_serializer_class(self):
        if self.action == "manual":
            return ManualQuoteCreateSerializer
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
        if self.action == "manual":
            return [HasStaffCapability(StaffCapability.MANAGE_QUOTES)]
        if self.action in ["approve", "request_change", "approve_price"]:
            return [
                IsAuthenticated(),
                IsOwnerOrStaff(
                    owner_field="user",
                    staff_capability=StaffCapability.MANAGE_QUOTES,
                ),
            ]
        if self.action == "upload_proof":
            return [HasStaffCapability(StaffCapability.MANAGE_ARTWORK)]
        if self.action == "export":
            return [HasStaffCapability(StaffCapability.EXPORT_QUOTES)]
        if self.action in [
            "set_status",
            "set_price",
            "convert_to_order",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [HasStaffCapability(StaffCapability.MANAGE_QUOTES)]
        return [
            IsAuthenticated(),
            IsOwnerOrStaff(
                owner_field="user",
                staff_capability=StaffCapability.VIEW_QUOTES,
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
        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            quote=quote,
            actor=request.user,
        )
        notify_quote_received(quote)
        detail = QuoteRequestDetailSerializer(quote, context={"request": request})
        return Response(detail.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="manual")
    def manual(self, request):
        serializer = ManualQuoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            quote=quote,
            actor=request.user,
            comment="Proposta criada pela equipa comercial.",
        )
        notify_quote_ready(quote)
        return Response(
            QuoteRequestDetailSerializer(
                quote, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )

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
        if not quote.can_transition_to(new_status):
            return Response(
                {
                    "detail": (
                        f"Transição inválida: de '{quote.get_status_display()}' "
                        "não é possível avançar para o estado escolhido."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_fields = ["status", "updated_at"]
        quote.status = new_status
        # Staff can record a client approval given offline (e.g. by phone);
        # stamp the same provenance the client portal would.
        if new_status == QuoteRequest.STATUS_APPROVED and not quote.price_approved_at:
            quote.price_approved_at = timezone.now()
            quote.price_approved_by = request.user
            quote.price_approval_comment = "Aprovação registada pela equipa."
            update_fields += [
                "price_approved_at",
                "price_approved_by",
                "price_approval_comment",
            ]
        quote.save(update_fields=update_fields)
        record_activity(
            action=ActivityEvent.ACTION_STATUS_CHANGED,
            quote=quote,
            actor=request.user,
            from_status=old_status,
            to_status=new_status,
        )
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
            record_activity(
                action=ActivityEvent.ACTION_STATUS_CHANGED,
                quote=quote,
                actor=request.user,
                from_status=old_status,
                to_status=quote.status,
            )
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
        record_activity(
            action=ActivityEvent.ACTION_ARTWORK_PROOF_UPLOADED,
            quote=quote,
            actor=request.user,
            comment=artwork.designer_comment,
        )

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_QUOTED
        quote.save(update_fields=["status", "updated_at"])
        if old_status != quote.status:
            record_activity(
                action=ActivityEvent.ACTION_STATUS_CHANGED,
                quote=quote,
                actor=request.user,
                from_status=old_status,
                to_status=quote.status,
            )
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
        record_activity(
            action=ActivityEvent.ACTION_ARTWORK_APPROVED,
            quote=quote,
            actor=request.user,
            comment=artwork.client_comment,
        )

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.save()
        if old_status != quote.status:
            record_activity(
                action=ActivityEvent.ACTION_STATUS_CHANGED,
                quote=quote,
                actor=request.user,
                from_status=old_status,
                to_status=quote.status,
            )
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
        record_activity(
            action=ActivityEvent.ACTION_ARTWORK_CHANGES_REQUESTED,
            quote=quote,
            actor=request.user,
            comment=artwork.requested_changes,
        )

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_REVIEWING
        quote.save()
        if old_status != quote.status:
            record_activity(
                action=ActivityEvent.ACTION_STATUS_CHANGED,
                quote=quote,
                actor=request.user,
                from_status=old_status,
                to_status=quote.status,
            )
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
        serializer = QuoteApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if quote.status != QuoteRequest.STATUS_QUOTED:
            return Response(
                {"detail": "Apenas orçamentos no estado 'Orçamentado' podem ser aprovados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.price_approved_at = timezone.now()
        quote.price_approved_by = request.user if request.user.is_authenticated else None
        quote.price_approval_comment = serializer.validated_data.get("comment", "")
        quote.save(
            update_fields=[
                "status",
                "price_approved_at",
                "price_approved_by",
                "price_approval_comment",
                "updated_at",
            ]
        )
        record_activity(
            action=ActivityEvent.ACTION_PRICE_APPROVED,
            quote=quote,
            actor=request.user,
            from_status=old_status,
            to_status=quote.status,
            comment=quote.price_approval_comment,
        )
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

        if not quote.price_approved_at:
            return Response(
                {
                    "detail": "O cliente ainda não aprovou o preço deste orçamento. "
                    "Aguarde a aprovação ou registe-a em nome do cliente."
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

        record_activity(
            action=ActivityEvent.ACTION_CONVERTED_TO_ORDER,
            quote=quote,
            actor=request.user,
            comment=f"Encomenda {order.reference}",
        )
        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            order=order,
            actor=request.user,
            comment=f"Orçamento {quote.reference}",
        )

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
