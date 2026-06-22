from rest_framework import serializers

from apps.catalog.models import Product, ProductVariant
from apps.core.fields import RelativeFileField

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        slug_field="slug",
        required=True,
    )
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.CharField(source="product.image", read_only=True)
    variant_name = serializers.CharField(source="product_variant.name", read_only=True)
    artwork_file = RelativeFileField(required=False)

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "product_slug",
            "product_name",
            "product_image",
            "product_variant",
            "variant_name",
            "description",
            "quantity",
            "size",
            "material",
            "colors",
            "needs_design",
            "artwork_file",
            "notes",
            "position",
            "created_at",
        ]
        extra_kwargs = {
            "product": {"required": False},
            "product_variant": {"required": False},
        }


class CartItemCreateUpdateSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        slug_field="slug",
        required=True,
    )
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(),
        source="product_variant",
        required=False,
        allow_null=True,
    )
    artwork_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = CartItem
        fields = [
            "product_slug",
            "product_variant_id",
            "description",
            "quantity",
            "size",
            "material",
            "colors",
            "needs_design",
            "artwork_file",
            "notes",
            "position",
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "user", "items", "item_count", "created_at", "updated_at"]
        read_only_fields = ["user"]
