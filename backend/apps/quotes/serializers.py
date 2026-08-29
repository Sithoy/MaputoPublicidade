from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.catalog.models import Product, ProductVariant
from apps.core.fields import RelativeFileField

from .models import ArtworkApproval, ArtworkProofVersion, QuoteItem, QuoteRequest


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


class ArtworkProofVersionSerializer(serializers.ModelSerializer):
    client_decision_display = serializers.CharField(
        source="get_client_decision_display", read_only=True
    )
    file = RelativeFileField(read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ArtworkProofVersion
        fields = [
            "id",
            "version",
            "file",
            "designer_comment",
            "uploaded_by_name",
            "client_decision",
            "client_decision_display",
            "client_comment",
            "created_at",
        ]

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return None
        request = self.context.get("request")
        viewer_is_staff = bool(
            request and request.user.is_authenticated and request.user.is_staff
        )
        if obj.uploaded_by.is_staff and not viewer_is_staff:
            return "Equipa MP"
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email



class QuoteRequestListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)
    order_reference = serializers.SerializerMethodField()
    artwork_status = serializers.SerializerMethodField()
    payment_option_display = serializers.CharField(
        source="get_payment_option_display", read_only=True
    )
    contact_source_display = serializers.CharField(
        source="get_contact_source_display", read_only=True
    )
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
            "contact_source",
            "contact_source_display",
            "status",
            "status_display",
            "urgency",
            "estimated_delivery_days",
            "payment_option",
            "payment_option_display",
            "item_count",
            "estimated_price",
            "final_price",
            "order_reference",
            "artwork_status",
            "created_at",
        ]

    def get_order_reference(self, obj):
        if hasattr(obj, "order") and obj.order:
            return obj.order.reference
        return None

    def get_artwork_status(self, obj):
        if hasattr(obj, "artwork") and obj.artwork:
            return obj.artwork.status
        return None


class QuoteRequestDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    urgency_display = serializers.CharField(source="get_urgency_display", read_only=True)
    payment_option_display = serializers.CharField(
        source="get_payment_option_display", read_only=True
    )
    contact_source_display = serializers.CharField(
        source="get_contact_source_display", read_only=True
    )
    items = QuoteItemSerializer(many=True, read_only=True)
    artwork = serializers.SerializerMethodField()
    order_reference = serializers.SerializerMethodField()
    price_approved_by_name = serializers.SerializerMethodField()
    # Staff-only: never leak internal notes to the client who owns the quote.
    internal_notes = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()
    proof_versions = ArtworkProofVersionSerializer(many=True, read_only=True)
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
            "contact_source",
            "contact_source_display",
            "urgency",
            "urgency_display",
            "notes",
            "internal_notes",
            "status",
            "status_display",
            "estimated_price",
            "final_price",
            "price_approved_at",
            "price_approved_by_name",
            "price_approval_comment",
            "valid_until",
            "terms",
            "estimated_delivery_days",
            "payment_option",
            "payment_option_display",
            "items",
            "artwork",
            "order_reference",
            "activity",
            "proof_versions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["reference", "user", "status", "estimated_price", "final_price"]

    def get_price_approved_by_name(self, obj):
        if obj.price_approved_by:
            return obj.price_approved_by.get_full_name() or obj.price_approved_by.email
        return None

    def get_internal_notes(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and (
            has_staff_capability(request.user, StaffCapability.MANAGE_QUOTES)
            or has_staff_capability(request.user, StaffCapability.MANAGE_ARTWORK)
        ):
            return obj.internal_notes
        return None

    def get_activity(self, obj):
        from apps.core.activity import serialize_activity

        return serialize_activity(obj, self.context)

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


class ManualQuoteItemSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        required=False,
        allow_null=True,
    )
    description = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0")
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class ManualQuoteCreateSerializer(serializers.Serializer):
    """Create a priced commercial proposal on behalf of a client."""

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=False, is_active=True),
        source="user",
        required=False,
        allow_null=True,
    )
    client_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    client_email = serializers.EmailField(required=False, allow_blank=True)
    client_phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    client_company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    urgency = serializers.ChoiceField(
        choices=QuoteRequest.URGENCY_CHOICES,
        default=QuoteRequest.URGENCY_NORMAL,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    internal_notes = serializers.CharField(required=False, allow_blank=True)
    estimated_delivery_days = serializers.IntegerField(min_value=1, max_value=365)
    payment_option = serializers.ChoiceField(
        choices=QuoteRequest.PAYMENT_OPTION_CHOICES,
        default=QuoteRequest.PAYMENT_DEPOSIT_50,
    )
    items = ManualQuoteItemSerializer(many=True, allow_empty=False)

    def validate(self, attrs):
        user = attrs.get("user")
        if user:
            profile = getattr(user, "profile", None)
            attrs["client_name"] = attrs.get("client_name") or user.get_full_name() or user.email
            attrs["client_email"] = attrs.get("client_email") or user.email
            attrs["client_phone"] = attrs.get("client_phone") or getattr(profile, "phone", "")
            attrs["client_company"] = attrs.get("client_company") or getattr(profile, "company", "")
        if not attrs.get("client_name"):
            raise serializers.ValidationError({"client_name": "Indique o nome do cliente."})
        if not attrs.get("client_email"):
            raise serializers.ValidationError({"client_email": "Indique o e-mail do cliente."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        total = sum(
            item["unit_price"] * Decimal(item["quantity"])
            for item in items_data
        )
        quote = QuoteRequest.objects.create(
            **validated_data,
            status=QuoteRequest.STATUS_QUOTED,
            estimated_price=total,
            final_price=total,
        )
        for position, item in enumerate(items_data):
            QuoteItem.objects.create(
                quote=quote,
                product=item.get("product"),
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                notes=item.get("notes", ""),
                position=position,
            )
        return quote


class ReceptionIntakeItemSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        required=False,
        allow_null=True,
    )
    description = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class ReceptionIntakeSerializer(serializers.Serializer):
    OUTCOME_QUOTE = "quote"
    OUTCOME_CONFIRMED_ORDER = "confirmed_order"
    OUTCOME_CHOICES = [
        (OUTCOME_QUOTE, "Pedido para orçamento"),
        (OUTCOME_CONFIRMED_ORDER, "Encomenda confirmada"),
    ]

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=False, is_active=True),
        source="user",
        required=False,
        allow_null=True,
    )
    client_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    client_email = serializers.EmailField(required=False, allow_blank=True)
    client_phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    client_company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    contact_source = serializers.ChoiceField(choices=QuoteRequest.CONTACT_SOURCE_CHOICES)
    outcome = serializers.ChoiceField(choices=OUTCOME_CHOICES)
    urgency = serializers.ChoiceField(
        choices=QuoteRequest.URGENCY_CHOICES,
        default=QuoteRequest.URGENCY_NORMAL,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    internal_notes = serializers.CharField(required=False, allow_blank=True)
    estimated_delivery_days = serializers.IntegerField(
        min_value=1, max_value=365, required=False, allow_null=True
    )
    payment_option = serializers.ChoiceField(
        choices=QuoteRequest.PAYMENT_OPTION_CHOICES,
        default=QuoteRequest.PAYMENT_DEPOSIT_50,
    )
    delivery_method = serializers.ChoiceField(
        choices=[("pickup", "Levantamento"), ("delivery", "Entrega")],
        default="pickup",
    )
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    items = ReceptionIntakeItemSerializer(many=True, allow_empty=False)

    def validate(self, attrs):
        user = attrs.get("user")
        if user:
            profile = getattr(user, "profile", None)
            attrs["client_name"] = attrs.get("client_name") or user.get_full_name() or user.email
            attrs["client_email"] = attrs.get("client_email") or user.email
            attrs["client_phone"] = attrs.get("client_phone") or getattr(profile, "phone", "")
            attrs["client_company"] = attrs.get("client_company") or getattr(profile, "company", "")
            attrs["delivery_address"] = attrs.get("delivery_address") or getattr(profile, "address", "")

        if not attrs.get("client_name"):
            raise serializers.ValidationError({"client_name": "Indique o nome do cliente."})
        if not (attrs.get("client_email") or attrs.get("client_phone")):
            raise serializers.ValidationError(
                {"client_phone": "Indique pelo menos um telefone ou e-mail."}
            )

        if attrs["outcome"] == self.OUTCOME_CONFIRMED_ORDER:
            missing_prices = [
                index + 1
                for index, item in enumerate(attrs["items"])
                if item.get("unit_price") is None
            ]
            if missing_prices:
                raise serializers.ValidationError(
                    {
                        "items": (
                            "Indique o preço de todos os itens para uma encomenda confirmada. "
                            f"Itens sem preço: {', '.join(map(str, missing_prices))}."
                        )
                    }
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        outcome = validated_data.pop("outcome")
        validated_data.pop("delivery_method", None)
        validated_data.pop("delivery_address", None)
        priced_items = [item for item in items_data if item.get("unit_price") is not None]
        total = sum(
            item["unit_price"] * Decimal(item["quantity"])
            for item in priced_items
        )
        quote = QuoteRequest.objects.create(
            **validated_data,
            status=(
                QuoteRequest.STATUS_QUOTED
                if outcome == self.OUTCOME_CONFIRMED_ORDER
                else QuoteRequest.STATUS_RECEIVED
            ),
            estimated_price=total if priced_items else None,
            final_price=(
                total if outcome == self.OUTCOME_CONFIRMED_ORDER else None
            ),
        )
        for position, item in enumerate(items_data):
            QuoteItem.objects.create(
                quote=quote,
                product=item.get("product"),
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item.get("unit_price"),
                notes=item.get("notes", ""),
                position=position,
            )
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
            "valid_until",
            "terms",
            "estimated_delivery_days",
            "payment_option",
        ]

    def validate_status(self, value):
        if self.instance and not self.instance.can_transition_to(value):
            raise serializers.ValidationError(
                f"Transição inválida a partir de '{self.instance.get_status_display()}'."
            )
        return value


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
