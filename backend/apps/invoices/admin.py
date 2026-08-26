from django.contrib import admin

from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "client_name",
        "issue_date",
        "due_date",
        "status",
        "total",
    )
    list_filter = ("status", "issue_date")
    search_fields = ("reference", "client_name", "client_email", "client_company")
    readonly_fields = ("reference", "subtotal", "tax_amount", "total", "created_at", "updated_at")
    inlines = [InvoiceItemInline]
