from django.contrib import admin

from .models import ArtworkApproval, QuoteRequest


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
        "product",
        "quantity",
        "status",
        "urgency",
        "created_at",
    ]
    list_filter = ["status", "urgency", "created_at", "product__category"]
    search_fields = ["reference", "client_name", "client_email", "client_company", "notes", "internal_notes"]
    readonly_fields = ["reference", "created_at", "updated_at"]
    inlines = [ArtworkApprovalInline]
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
                    "product",
                    "quantity",
                    "size",
                    "material",
                    "colors",
                    "needs_design",
                    "urgency",
                    "notes",
                    "internal_notes",
                    "file",
                ]
            },
        ),
        (
            "Preços",
            {"fields": ["estimated_price", "final_price"]},
        ),
    ]


@admin.register(ArtworkApproval)
class ArtworkApprovalAdmin(admin.ModelAdmin):
    list_display = ["quote", "status", "approved_at", "created_at"]
    list_filter = ["status", "created_at", "approved_at"]
    search_fields = ["quote__reference", "client_comment", "requested_changes"]
