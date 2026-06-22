from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "order",
        "amount",
        "method",
        "status",
        "reference_code",
        "recorded_by",
        "created_at",
    ]
    list_filter = ["method", "status", "created_at"]
    search_fields = ["order__reference", "reference_code", "notes"]
    date_hierarchy = "created_at"
