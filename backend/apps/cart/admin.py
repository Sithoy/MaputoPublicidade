from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["user", "item_count", "updated_at"]
    inlines = [CartItemInline]

    def item_count(self, obj):
        return obj.items.count()


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ["product", "quantity", "cart", "created_at"]
