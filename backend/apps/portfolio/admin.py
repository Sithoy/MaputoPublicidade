from django.contrib import admin

from .models import Partner, PortfolioItem


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "client_name", "is_featured", "is_active", "created_at"]
    list_filter = ["category", "is_featured", "is_active", "completion_date"]
    search_fields = ["title", "slug", "description", "client_name"]


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ["name", "sector", "display_order", "is_featured", "is_active", "created_at"]
    list_filter = ["is_featured", "is_active", "sector"]
    search_fields = ["name", "slug", "sector", "description", "website"]
    prepopulated_fields = {"slug": ("name",)}
