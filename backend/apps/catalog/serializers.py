from django.db import transaction
from rest_framework import serializers

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.core.fields import PersistedImageSerializerMixin, PersistentImageField

from .apparel import ApparelOptionsSerializer
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
        queryset=ServiceCategory.objects.all(), source="category", write_only=True, required=False, allow_null=True
    )
    base_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, required=False, allow_null=True
    )
    image = PersistentImageField(required=False, allow_null=True)
    variants = serializers.SerializerMethodField()
    starting_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )
    has_variants = serializers.BooleanField(read_only=True)
    variant_config = serializers.JSONField(write_only=True, required=False)
    clear_image = serializers.BooleanField(write_only=True, required=False)

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
            "variant_config",
            "clear_image",
            "starting_price",
            "has_variants",
            "materials",
            "order_template",
            "apparel_options",
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
        if (
            user
            and user.is_authenticated
            and getattr(user, "is_staff", False)
            and has_staff_capability(user, StaffCapability.MANAGE_CATALOG)
        ):
            filtered = all_variants
        else:
            filtered = [v for v in all_variants if v.is_active]
        sorted_variants = sorted(filtered, key=lambda v: (v.position, v.name))
        return ProductVariantSerializer(sorted_variants, many=True, context=self.context).data

    def validate(self, values):
        if values.pop('clear_image', False) and 'image' not in values:
            values['image'] = None
        if 'variant_config' in values:
            rows = values['variant_config']
            if not isinstance(rows, list) or len(rows) > 50:
                raise serializers.ValidationError({'variant_config': 'Indique até 50 versões comerciais.'})
            existing = {v.id: v for v in self.instance.variants.all()} if self.instance else {}
            seen = set()
            plan = []
            request = self.context.get('request')
            files = getattr(request, 'FILES', {})
            for index, row in enumerate(rows):
                allowed = {'id', 'name', 'sku', 'price', 'is_active', 'clear_image'}
                if not isinstance(row, dict) or set(row) - allowed:
                    raise serializers.ValidationError({'variant_config': 'Versão comercial inválida.'})
                variant_id = row.get('id')
                if variant_id is not None and (type(variant_id) is not int or variant_id not in existing or variant_id in seen):
                    raise serializers.ValidationError({'variant_config': 'A versão não pertence a este produto ou está repetida.'})
                if variant_id is not None:
                    seen.add(variant_id)
                payload = {key: value for key, value in row.items() if key not in ('id', 'clear_image')}
                payload['position'] = index
                if row.get('clear_image') not in (None, True, False):
                    raise serializers.ValidationError({'variant_config': 'Opção de imagem inválida.'})
                if row.get('clear_image'):
                    payload['image'] = None
                if f'variant_image_{index}' in files:
                    payload['image'] = files[f'variant_image_{index}']
                serializer = ProductVariantSerializer(instance=existing.get(variant_id), data=payload, context=self.context)
                if not serializer.is_valid():
                    raise serializers.ValidationError({'variant_config': {index: serializer.errors}})
                plan.append((variant_id, serializer.validated_data))
            values['variant_config'] = plan
        if values.get('order_template', getattr(self.instance, 'order_template', 'standard')) == 'apparel':
            options = ApparelOptionsSerializer(data=values.get('apparel_options', getattr(self.instance, 'apparel_options', {})))
            options.is_valid(raise_exception=True)
            values['apparel_options'] = options.validated_data
        return values

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result['category_id'] = instance.category_id
        return result

    def _save_variants(self, product, plan):
        if plan is None:
            return
        kept = []
        for variant_id, data in plan:
            serializer = ProductVariantSerializer(context=self.context)
            if variant_id:
                variant = product.variants.select_for_update().get(pk=variant_id)
                serializer.update(variant, data)
            else:
                variant = serializer.create({**data, 'product': product})
            kept.append(variant.id)
        # Preserve historical references: removed versions become inactive, not deleted.
        product.variants.exclude(pk__in=kept).update(is_active=False)
        if hasattr(product, '_prefetched_objects_cache'):
            product._prefetched_objects_cache.pop('variants', None)

    @transaction.atomic
    def create(self, validated_data):
        plan = validated_data.pop('variant_config', None)
        product = super().create(validated_data)
        self._save_variants(product, plan)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        plan = validated_data.pop('variant_config', None)
        Product.objects.select_for_update().get(pk=instance.pk)
        product = super().update(instance, validated_data)
        self._save_variants(product, plan)
        return product


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
