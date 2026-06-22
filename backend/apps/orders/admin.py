from django.contrib import admin

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
