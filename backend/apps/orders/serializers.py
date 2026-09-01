from django.contrib.auth.models import User
from rest_framework import serializers

from apps.accounts.roles import StaffCapability, has_staff_capability
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
    client_name = serializers.CharField(source="client_name_display", read_only=True)
    invoice_reference = serializers.SerializerMethodField()
    artwork_status = serializers.SerializerMethodField()

    def get_invoice_reference(self, obj):
        return obj.invoice.reference if hasattr(obj, "invoice") else None

    class Meta:
        model = Order
        fields = [
            "id",
            "reference",
            "client_name",
            "invoice_reference",
            "status",
            "status_display",
            "final_price",
            "payment_status",
            "payment_status_display",
            "amount_paid",
            "amount_due",
            "item_count",
            "artwork_status",
            "created_at",
        ]

    def get_artwork_status(self, obj):
        if obj.quote and hasattr(obj.quote, "artwork") and obj.quote.artwork:
            return obj.quote.artwork.status
        return None


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
    # Staff-only: never leak internal notes to the client who owns the order.
    internal_notes = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()
    delivery_responsible_name = serializers.SerializerMethodField()
    completion_photo = RelativeFileField(read_only=True)
    invoice_reference = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "reference",
            "quote",
            "quote_reference",
            "invoice_reference",
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
            "scheduled_date",
            "installation_required",
            "delivery_responsible",
            "delivery_responsible_name",
            "completion_photo",
            "client_confirmed_at",
            "internal_notes",
            "items",
            "artwork",
            "activity",
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

    def get_invoice_reference(self, obj):
        return obj.invoice.reference if hasattr(obj, "invoice") else None

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

    def get_internal_notes(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and (
            has_staff_capability(request.user, StaffCapability.MANAGE_ORDERS)
            or has_staff_capability(
                request.user, StaffCapability.MANAGE_ORDER_STATUS
            )
        ):
            return obj.internal_notes
        return None

    def get_activity(self, obj):
        from apps.core.activity import serialize_activity

        return serialize_activity(obj, self.context)

    def get_delivery_responsible_name(self, obj):
        if not obj.delivery_responsible:
            return None
        return obj.delivery_responsible.get_full_name() or obj.delivery_responsible.email


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

    def validate_status(self, value):
        if self.instance and not self.instance.can_transition_to(value):
            raise serializers.ValidationError(
                f"Transição inválida a partir de '{self.instance.get_status_display()}'."
            )
        return value

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


class OrderDeliverySerializer(serializers.Serializer):
    """Staff-only delivery/installation details."""

    delivery_method = serializers.ChoiceField(choices=Order.DELIVERY_CHOICES, required=False)
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    scheduled_date = serializers.DateTimeField(required=False, allow_null=True)
    installation_required = serializers.BooleanField(required=False)
    delivery_responsible_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=True, is_active=True),
        source="delivery_responsible",
        required=False,
        allow_null=True,
    )
    completion_photo = serializers.ImageField(required=False, allow_null=True)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)

class OrderPaymentSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=Order.PAYMENT_CHOICES)
    amount_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
