from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import ClientProfileSerializer
from apps.catalog.models import Product
from apps.core.fields import RelativeFileField

from .models import ArtworkApproval, QuoteRequest


class QuoteRequestListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    estimated_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )
    final_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )

    class Meta:
        model = QuoteRequest
        fields = [
            "id",
            "reference",
            "product_name",
            "product_slug",
            "quantity",
            "status",
            "status_display",
            "estimated_price",
            "final_price",
            "created_at",
        ]


class QuoteRequestDetailSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    urgency_display = serializers.CharField(source="get_urgency_display", read_only=True)
    artwork = serializers.SerializerMethodField()
    file = RelativeFileField(required=False)
    estimated_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )
    final_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )

    class Meta:
        model = QuoteRequest
        fields = [
            "id",
            "reference",
            "user",
            "client_name",
            "client_email",
            "client_phone",
            "client_company",
            "product",
            "product_name",
            "quantity",
            "size",
            "material",
            "colors",
            "needs_design",
            "urgency",
            "urgency_display",
            "notes",
            "internal_notes",
            "file",
            "status",
            "status_display",
            "estimated_price",
            "final_price",
            "created_at",
            "updated_at",
            "artwork",
        ]
        read_only_fields = ["reference", "user", "status", "estimated_price", "final_price"]

    def get_artwork(self, obj):
        if hasattr(obj, "artwork"):
            return ArtworkApprovalSerializer(obj.artwork).data
        return None


class QuoteRequestCreateSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        slug_field="slug",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = QuoteRequest
        fields = [
            "client_name",
            "client_email",
            "client_phone",
            "client_company",
            "product_slug",
            "quantity",
            "size",
            "material",
            "colors",
            "needs_design",
            "urgency",
            "notes",
            "file",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        quote = QuoteRequest.objects.create(user=user, **validated_data)

        if (
            quote.product
            and quote.product.pricing_complexity == Product.PRICING_SIMPLE
            and quote.product.base_price
        ):
            total = quote.product.base_price * Decimal(quote.quantity)
            if quote.urgency == QuoteRequest.URGENCY_URGENT:
                total = total * Decimal("1.25")
            quote.estimated_price = total
            quote.save(update_fields=["estimated_price"])

        return quote


class QuoteRequestUpdateSerializer(serializers.ModelSerializer):
    """Staff-only serializer for managing quote status, pricing and internal notes."""

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", required=False, allow_null=True
    )
    estimated_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, required=False, allow_null=True
    )
    final_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, required=False, allow_null=True
    )

    class Meta:
        model = QuoteRequest
        fields = [
            "status",
            "estimated_price",
            "final_price",
            "internal_notes",
            "user_id",
        ]


class ArtworkApprovalSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    proof_file = RelativeFileField(required=False)

    class Meta:
        model = ArtworkApproval
        fields = [
            "id",
            "status",
            "status_display",
            "proof_file",
            "designer_comment",
            "client_comment",
            "requested_changes",
            "approved_at",
            "created_at",
            "updated_at",
        ]


class ArtworkProofSerializer(serializers.ModelSerializer):
    """Staff-only serializer for uploading artwork proofs."""

    class Meta:
        model = ArtworkApproval
        fields = ["proof_file", "designer_comment"]


class QuoteStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=QuoteRequest.STATUS_CHOICES)


class QuotePriceSerializer(serializers.Serializer):
    estimated_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    final_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )


class QuoteApprovalSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)


class QuoteChangeRequestSerializer(serializers.Serializer):
    comment = serializers.CharField(required=True)
