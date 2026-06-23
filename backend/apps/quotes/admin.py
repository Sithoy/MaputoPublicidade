from django.contrib import admin

from apps.core.export_utils import export_response

from .models import ArtworkApproval, QuoteItem, QuoteRequest


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 0
    fields = ["product", "product_variant", "description", "quantity", "size", "material", "colors", "unit_price", "position", "needs_design"]


class ArtworkApprovalInline(admin.StackedInline):
    model = ArtworkApproval
    can_delete = False
    extra = 0


@admin.register(QuoteRequest)
class QuoteRequestAdmin(admin.ModelAdmin):
    list_display = [
        "reference",
        "client_name",
        "client_company",
        "status",
        "urgency",
        "created_at",
    ]
    list_filter = ["status", "urgency", "created_at"]
    search_fields = ["reference", "client_name", "client_email", "client_company", "notes", "internal_notes"]
    readonly_fields = ["reference", "created_at", "updated_at"]
    inlines = [QuoteItemInline, ArtworkApprovalInline]
    actions = ["export_csv", "export_xlsx"]
    fieldsets = [
        (
            "Identificação",
            {"fields": ["reference", "user", "status", "created_at", "updated_at"]},
        ),
        (
            "Cliente",
            {
                "fields": [
                    "client_name",
                    "client_email",
                    "client_phone",
                    "client_company",
                ]
            },
        ),
        (
            "Pedido",
            {
                "fields": [
                    "urgency",
                    "notes",
                    "internal_notes",
                ]
            },
        ),
        (
            "Preços",
            {"fields": ["estimated_price", "final_price"]},
        ),
    ]

    @admin.action(description="Exportar seleccionados para CSV")
    def export_csv(self, request, queryset):
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
        return export_response(queryset, field_map, "orcamentos", "csv")

    @admin.action(description="Exportar seleccionados para Excel")
    def export_xlsx(self, request, queryset):
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
        return export_response(queryset, field_map, "orcamentos", "xlsx")


@admin.register(ArtworkApproval)
class ArtworkApprovalAdmin(admin.ModelAdmin):
    list_display = ["quote", "status", "approved_at", "created_at"]
    list_filter = ["status", "created_at", "approved_at"]
    search_fields = ["quote__reference", "client_comment", "requested_changes"]
