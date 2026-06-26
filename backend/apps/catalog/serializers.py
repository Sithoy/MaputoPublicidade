from rest_framework import serializers

from apps.core.fields import PersistedImageSerializerMixin, PersistentImageField

from .models import Package, Product, ProductVariant, ServiceCategory


class ServiceCategorySerializer(PersistedImageSerializerMixin, serializers.ModelSerializer):
    image = PersistentImageField(required=False, allow_null=True)

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


class ProductVariantSerializer(PersistedImageSerializerMixin, serializers.ModelSerializer):
    image = PersistentImageField(required=False, allow_null=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "name",
            "sku",
            "price",
            "image",
            "position",
            "is_active",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "product": {"required": False},
        }


class ProductSerializer(PersistedImageSerializerMixin, serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.all(), source="category", write_only=True, required=False
    )
    base_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, required=False
    )
    image = PersistentImageField(required=False, allow_null=True)
    variants = serializers.SerializerMethodField()
    starting_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )
    has_variants = serializers.BooleanField(read_only=True)

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
            "variants",
            "starting_price",
            "has_variants",
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

    def get_variants(self, obj: Product):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        all_variants = obj.variants.all()
        if user and user.is_authenticated and getattr(user, "is_staff", False):
            filtered = all_variants
        else:
            filtered = [v for v in all_variants if v.is_active]
        sorted_variants = sorted(filtered, key=lambda v: (v.position, v.name))
        return ProductVariantSerializer(sorted_variants, many=True, context=self.context).data


class PackageSerializer(PersistedImageSerializerMixin, serializers.ModelSerializer):
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )
    image = PersistentImageField(required=False, allow_null=True)

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
