from rest_framework import serializers

from apps.accounts.serializers import ClientProfileSerializer
from apps.catalog.models import Product, ProductVariant
from apps.core.fields import RelativeFileField
from apps.quotes.serializers import ArtworkApprovalSerializer

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        slug_field="slug",
        required=False,
        allow_null=True,
    )
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_name = serializers.CharField(source="product_variant.name", read_only=True)
    artwork_file = RelativeFileField(required=False)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_slug",
            "product_name",
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
            "unit_price",
            "position",
            "created_at",
        ]
        extra_kwargs = {
            "product": {"required": False},
            "product_variant": {"required": False},
        }


class OrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )
    final_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )
    amount_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )
    amount_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "reference",
            "status",
            "status_display",
            "final_price",
            "payment_status",
            "payment_status_display",
            "amount_paid",
            "amount_due",
            "item_count",
            "created_at",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )
    delivery_method_display = serializers.CharField(
        source="get_delivery_method_display", read_only=True
    )
    amount_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )
    items = OrderItemSerializer(many=True, read_only=True)
    artwork = serializers.SerializerMethodField()
    quote_reference = serializers.CharField(source="quote.reference", read_only=True)
    user_email = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "reference",
            "quote",
            "quote_reference",
            "user",
            "user_email",
            "user_name",
            "profile",
            "estimated_price",
            "final_price",
            "payment_status",
            "payment_status_display",
            "amount_paid",
            "amount_due",
            "status",
            "status_display",
            "delivery_method",
            "delivery_method_display",
            "delivery_address",
            "internal_notes",
            "items",
            "artwork",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "reference",
            "user",
            "quote",
            "amount_due",
            "artwork",
        ]

    def get_artwork(self, obj):
        if obj.quote and hasattr(obj.quote, "artwork"):
            return ArtworkApprovalSerializer(obj.quote.artwork).data
        return None

    def get_user_email(self, obj):
        return obj.client_email_display

    def get_user_name(self, obj):
        return obj.client_name_display

    def get_profile(self, obj):
        if not obj.user:
            return None
        profile = getattr(obj.user, "profile", None)
        if profile:
            return ClientProfileSerializer(profile).data
        return None


class OrderItemCreateSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        slug_field="slug",
        required=False,
        allow_null=True,
    )
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(),
        source="product_variant",
        required=False,
        allow_null=True,
    )
    artwork_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = OrderItem
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
            "unit_price",
            "position",
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemCreateSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            "quote",
            "user",
            "estimated_price",
            "final_price",
            "status",
            "delivery_method",
            "delivery_address",
            "internal_notes",
            "items",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        order = Order.objects.create(**validated_data)
        for idx, item_data in enumerate(items_data):
            OrderItem.objects.create(
                order=order,
                product=item_data.get("product"),
                product_variant=item_data.get("product_variant"),
                description=item_data.get("description", ""),
                quantity=item_data.get("quantity", 1),
                size=item_data.get("size", ""),
                material=item_data.get("material", ""),
                colors=item_data.get("colors", ""),
                needs_design=item_data.get("needs_design", False),
                artwork_file=item_data.get("artwork_file"),
                notes=item_data.get("notes", ""),
                unit_price=item_data.get("unit_price"),
                position=item_data.get("position", idx),
            )
        return order


class OrderUpdateSerializer(serializers.ModelSerializer):
    items = OrderItemCreateSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            "estimated_price",
            "final_price",
            "payment_status",
            "amount_paid",
            "status",
            "delivery_method",
            "delivery_address",
            "internal_notes",
            "items",
        ]

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for idx, item_data in enumerate(items_data):
                OrderItem.objects.create(
                    order=instance,
                    product=item_data.get("product"),
                    product_variant=item_data.get("product_variant"),
                    description=item_data.get("description", ""),
                    quantity=item_data.get("quantity", 1),
                    size=item_data.get("size", ""),
                    material=item_data.get("material", ""),
                    colors=item_data.get("colors", ""),
                    needs_design=item_data.get("needs_design", False),
                    artwork_file=item_data.get("artwork_file"),
                    notes=item_data.get("notes", ""),
                    unit_price=item_data.get("unit_price"),
                    position=item_data.get("position", idx),
                )
        return instance


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)


class OrderPaymentSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=Order.PAYMENT_CHOICES)
    amount_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
