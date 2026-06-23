from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.catalog.models import Product, ProductVariant
from apps.core.fields import RelativeFileField

from .models import ArtworkApproval, QuoteItem, QuoteRequest


class QuoteItemSerializer(serializers.ModelSerializer):
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
        model = QuoteItem
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


class QuoteRequestListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)
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
            "client_name",
            "client_company",
            "status",
            "status_display",
            "urgency",
            "item_count",
            "estimated_price",
            "final_price",
            "created_at",
        ]


class QuoteRequestDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    urgency_display = serializers.CharField(source="get_urgency_display", read_only=True)
    items = QuoteItemSerializer(many=True, read_only=True)
    artwork = serializers.SerializerMethodField()
    order_reference = serializers.SerializerMethodField()
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
            "urgency",
            "urgency_display",
            "notes",
            "internal_notes",
            "status",
            "status_display",
            "estimated_price",
            "final_price",
            "items",
            "artwork",
            "order_reference",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["reference", "user", "status", "estimated_price", "final_price"]

    def get_artwork(self, obj):
        if hasattr(obj, "artwork"):
            return ArtworkApprovalSerializer(obj.artwork).data
        return None

    def get_order_reference(self, obj):
        if hasattr(obj, "order") and obj.order:
            return obj.order.reference
        return None


class QuoteItemCreateSerializer(serializers.ModelSerializer):
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
        model = QuoteItem
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


class QuoteRequestCreateSerializer(serializers.ModelSerializer):
    items = QuoteItemCreateSerializer(many=True)

    class Meta:
        model = QuoteRequest
        fields = [
            "client_name",
            "client_email",
            "client_phone",
            "client_company",
            "urgency",
            "notes",
            "items",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        items_data = validated_data.pop("items", [])
        quote = QuoteRequest.objects.create(user=user, **validated_data)

        for idx, item_data in enumerate(items_data):
            product = item_data.get("product")
            variant = item_data.get("product_variant")
            description = item_data.get("description") or (product.name if product else "")
            QuoteItem.objects.create(
                quote=quote,
                product=product,
                product_variant=variant,
                description=description,
                quantity=item_data.get("quantity", 1),
                size=item_data.get("size", ""),
                material=item_data.get("material", ""),
                colors=item_data.get("colors", ""),
                needs_design=item_data.get("needs_design", False),
                artwork_file=item_data.get("artwork_file"),
                notes=item_data.get("notes", ""),
                position=item_data.get("position", idx),
            )

        self._auto_estimate(quote)
        return quote

    def _auto_estimate(self, quote):
        total = Decimal("0")
        for item in quote.items.all():
            price = None
            if item.product_variant and item.product_variant.price:
                price = item.product_variant.price
            elif item.product and item.product.base_price:
                price = item.product.base_price
            if price:
                total += price * Decimal(item.quantity)
        if total > 0:
            if quote.urgency == QuoteRequest.URGENCY_URGENT:
                total = total * Decimal("1.25")
            quote.estimated_price = total
            quote.save(update_fields=["estimated_price"])


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
