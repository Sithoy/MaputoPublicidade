from django.contrib import admin

from .models import Package, Product, ProductVariant, ServiceCategory


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "icon_name", "display_order", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug", "short_description"]
    prepopulated_fields = {"slug": ("name",)}


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["name", "sku", "price", "image", "position", "is_active"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "base_price",
        "pricing_complexity",
        "min_quantity",
        "is_featured",
        "is_active",
    ]
    list_filter = ["category", "pricing_complexity", "is_featured", "is_active"]
    search_fields = ["name", "slug", "description"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductVariantInline]


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ["name", "price", "target_audience", "is_recurring", "is_active"]
    list_filter = ["is_recurring", "is_active"]
    search_fields = ["name", "slug", "description", "target_audience"]
    prepopulated_fields = {"slug": ("name",)}
