from rest_framework import serializers

from apps.core.fields import RelativeImageField

from .models import Package, Product, ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    image = RelativeImageField(required=False)

    class Meta:
        model = ServiceCategory
        fields = [
            "id",
            "name",
            "slug",
            "icon_name",
            "short_description",
            "description",
            "image",
            "display_order",
            "is_active",
        ]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.all(), source="category", write_only=True, required=False
    )
    base_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, required=False
    )
    image = RelativeImageField(required=False)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "category_id",
            "description",
            "image",
            "materials",
            "sizes",
            "min_quantity",
            "lead_time",
            "base_price",
            "pricing_complexity",
            "is_featured",
            "is_active",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "materials": {"required": False},
            "sizes": {"required": False},
        }


class PackageSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )
    image = RelativeImageField(required=False)

    class Meta:
        model = Package
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "price",
            "items",
            "image",
            "target_audience",
            "is_recurring",
            "is_active",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "items": {"required": False},
        }
