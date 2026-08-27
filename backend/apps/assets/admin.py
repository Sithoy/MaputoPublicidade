from django.contrib import admin

from .models import BrandAsset


@admin.register(BrandAsset)
class BrandAssetAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "user", "uploaded_by", "created_at")
    list_filter = ("kind",)
    search_fields = ("name", "user__email", "user__first_name", "user__last_name")
