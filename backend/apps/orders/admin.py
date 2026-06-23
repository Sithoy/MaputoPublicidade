from django.contrib import admin

from apps.core.export_utils import export_response

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ["product", "product_variant", "description", "quantity", "size", "material", "colors", "unit_price", "position", "needs_design"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "reference",
        "user",
        "status",
        "payment_status",
        "final_price",
        "created_at",
    ]
    list_filter = ["status", "payment_status", "delivery_method", "created_at"]
    search_fields = ["reference", "user__email", "user__first_name", "user__last_name"]
    readonly_fields = ["reference", "created_at", "updated_at"]
    autocomplete_fields = ["user", "quote"]
    inlines = [OrderItemInline]
    actions = ["export_csv", "export_xlsx"]

    @admin.action(description="Exportar seleccionados para CSV")
    def export_csv(self, request, queryset):
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
        return export_response(queryset, field_map, "encomendas", "csv")

    @admin.action(description="Exportar seleccionados para Excel")
    def export_xlsx(self, request, queryset):
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
        return export_response(queryset, field_map, "encomendas", "xlsx")
