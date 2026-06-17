from django.contrib import admin

from .models import PortfolioItem


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "client_name", "is_featured", "is_active", "created_at"]
    list_filter = ["category", "is_featured", "is_active", "completion_date"]
    search_fields = ["title", "slug", "description", "client_name"]
