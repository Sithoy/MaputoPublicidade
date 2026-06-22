from django.contrib import admin

from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "reference",
        "user",
        "product_name",
        "status",
        "payment_status",
        "final_price",
        "created_at",
    ]
    list_filter = ["status", "payment_status", "delivery_method", "created_at"]
    search_fields = ["reference", "product_name", "user__email", "user__first_name", "user__last_name"]
    readonly_fields = ["reference", "created_at", "updated_at"]
    autocomplete_fields = ["user", "quote"]
