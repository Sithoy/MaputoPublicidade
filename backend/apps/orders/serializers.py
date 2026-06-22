from rest_framework import serializers

from apps.accounts.serializers import ClientProfileSerializer
from apps.core.fields import RelativeFileField
from apps.quotes.serializers import ArtworkApprovalSerializer

from .models import Order


class OrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )
    amount_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "reference",
            "product_name",
            "quantity",
            "status",
            "status_display",
            "final_price",
            "payment_status",
            "payment_status_display",
            "amount_paid",
            "amount_due",
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
    client_file = RelativeFileField(required=False)
    artwork = serializers.SerializerMethodField()
    quote_reference = serializers.CharField(source="quote.reference", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
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
            "product_name",
            "quantity",
            "size",
            "material",
            "colors",
            "needs_design",
            "client_file",
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

    def get_user_name(self, obj):
        full = obj.user.get_full_name()
        return full or obj.user.email

    def get_profile(self, obj):
        profile = getattr(obj.user, "profile", None)
        if profile:
            return ClientProfileSerializer(profile).data
        return None


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "quote",
            "user",
            "product_name",
            "quantity",
            "size",
            "material",
            "colors",
            "needs_design",
            "client_file",
            "final_price",
            "status",
            "delivery_method",
            "delivery_address",
            "internal_notes",
        ]


class OrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "product_name",
            "quantity",
            "size",
            "material",
            "colors",
            "needs_design",
            "client_file",
            "final_price",
            "payment_status",
            "amount_paid",
            "status",
            "delivery_method",
            "delivery_address",
            "internal_notes",
        ]


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)


class OrderPaymentSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=Order.PAYMENT_CHOICES)
    amount_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
