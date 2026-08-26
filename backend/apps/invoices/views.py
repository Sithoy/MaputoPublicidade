from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.accounts.roles import StaffCapability
from apps.core.export_utils import export_response
from apps.core.permissions import HasStaffCapability

from .models import Invoice
from .serializers import InvoiceSerializer, InvoiceStatusSerializer


class InvoiceViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = (
        Invoice.objects.select_related("order", "user", "created_by")
        .prefetch_related("items")
        .all()
    )
    serializer_class = InvoiceSerializer
    lookup_field = "reference"
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["reference", "client_name", "client_email", "client_company"]
    ordering_fields = ["issue_date", "due_date", "total", "created_at"]
    ordering = ["-issue_date", "-created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "set_status"]:
            return [HasStaffCapability(StaffCapability.MANAGE_INVOICES)]
        if self.action == "export":
            return [HasStaffCapability(StaffCapability.EXPORT_INVOICES)]
        return [HasStaffCapability(StaffCapability.VIEW_INVOICES)]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, reference=None):
        invoice = self.get_object()
        serializer = InvoiceStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        allowed = {
            Invoice.STATUS_DRAFT: {Invoice.STATUS_ISSUED, Invoice.STATUS_CANCELLED},
            Invoice.STATUS_ISSUED: {Invoice.STATUS_PAID, Invoice.STATUS_CANCELLED},
            Invoice.STATUS_PAID: set(),
            Invoice.STATUS_CANCELLED: {Invoice.STATUS_DRAFT},
        }
        if new_status != invoice.status and new_status not in allowed[invoice.status]:
            return Response(
                {"detail": "Transição de estado inválida para esta fatura."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invoice.status = new_status
        update_fields = ["status", "updated_at"]
        if new_status == Invoice.STATUS_PAID:
            invoice.recorded_amount_paid = invoice.total
            update_fields.append("recorded_amount_paid")
        invoice.save(update_fields=update_fields)
        return Response(InvoiceSerializer(invoice, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        fmt = request.query_params.get("format", "csv")
        queryset = self.get_queryset()
        field_map = {
            "Fatura": "reference",
            "Emissao": lambda obj: obj.issue_date.strftime("%Y-%m-%d"),
            "Vencimento": lambda obj: obj.due_date.strftime("%Y-%m-%d"),
            "Cliente": "client_name",
            "Empresa": "client_company",
            "NUIT": "client_nuit",
            "Estado": lambda obj: obj.get_status_display(),
            "Subtotal": "subtotal",
            "Desconto": "discount_amount",
            "IVA": "tax_amount",
            "Total": "total",
            "Pago": lambda obj: obj.amount_paid,
            "Em divida": lambda obj: obj.balance_due,
            "Encomenda": lambda obj: obj.order.reference if obj.order else "",
        }
        return export_response(queryset, field_map, "faturas", fmt)
