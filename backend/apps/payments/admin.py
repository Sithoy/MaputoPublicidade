from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "order",
        "amount",
        "method",
        "provider",
        "status",
        "provider_transaction_id",
        "phone_number",
        "recorded_by",
        "created_at",
    ]
    list_filter = ["method", "provider", "status", "created_at"]
    search_fields = [
        "order__reference",
        "reference_code",
        "provider_transaction_id",
        "correlation_id",
        "phone_number",
        "notes",
    ]
    date_hierarchy = "created_at"
    readonly_fields = ["provider_payload", "correlation_id", "created_at", "updated_at"]
