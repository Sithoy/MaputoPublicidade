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
    material_briefing = serializers.JSONField(read_only=True)

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
            "material_briefing",
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
    file = serializers.SerializerMethodField()

    def get_file(self, obj):
        if obj.mime_type:
            return f'/api/artwork-files/{obj.pk}/'
        return RelativeFileField().to_representation(obj.file) if obj.file else ''
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
        viewer_is_staff = bool(request and request.user.is_authenticated and request.user.is_staff)
        if obj.uploaded_by.is_staff and not viewer_is_staff:
            return "Equipa MP"
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email


class ProposalWorkflowMixin:
    def get_workdesk(self, obj):
        request = self.context.get("request")
        if not request or not has_staff_capability(request.user, StaffCapability.MANAGE_RECEPTION):
            return None
        from apps.core.reception_hq import workdesk_context

        return workdesk_context(obj)

    def get_proposal_workflow(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_staff:
            return None
        def name(user):
            return (user.get_full_name() or user.email or user.username) if user else ""
        return {"stage": obj.proposal_stage, "stage_display": obj.get_proposal_stage_display(),
                "can_review": request.user.pk != obj.proposal_prepared_by_id and request.user.pk not in obj.proposal_editors,
                "version": obj.proposal_version, "owner_id": obj.reception_owner_id,
                "prepared_by": name(obj.proposal_prepared_by), "prepared_by_id": obj.proposal_prepared_by_id,
                "reviewed_by": name(obj.proposal_reviewed_by), "reviewed_at": obj.proposal_reviewed_at,
                "comment": obj.proposal_review_comment, "sent_at": obj.proposal_sent_at,
                "history": obj.proposal_history if isinstance(self, QuoteRequestDetailSerializer) else []}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and not request.user.is_staff and 'proof_versions' in data:
            published = set(instance.proof_versions.filter(published_at__isnull=False).values_list('id', flat=True))
            data['proof_versions'] = [version for version in data['proof_versions'] if version['id'] in published]
        if request and not request.user.is_staff and instance.proposal_stage not in {"legacy", "sent"}:
            for field in ("final_price", "estimated_price", "discount_amount", "discount_percentage", "tax_rate", "tax_amount", "subtotal", "terms", "valid_until", "estimated_delivery_days", "payment_option", "payment_option_display"):
                if field in data:
                    data[field] = None
            for item in data.get("items", []):
                item["unit_price"] = None
        return data


class QuoteRequestListSerializer(ProposalWorkflowMixin, serializers.ModelSerializer):
    workdesk = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    job_summary = serializers.SerializerMethodField()
    operational_order_status = serializers.CharField(source="order.status", default=None, read_only=True)
    proposal_workflow = serializers.SerializerMethodField()
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
    final_price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = QuoteRequest
        fields = [
            "id",
            "reference",
            "proposal_workflow",
            "reception_completed_at",
            "owner_name",
            "job_summary",
            "workdesk",
            "updated_at",
            "operational_order_status",
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

    def get_owner_name(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_staff:
            return "Equipa MP" if obj.reception_owner_id else ""
        return (obj.reception_owner.get_full_name() or obj.reception_owner.username) if obj.reception_owner else ""

    def get_job_summary(self, obj):
        items = list(obj.items.all())
        return items[0].description if items else "Necessidade por confirmar"

    def get_artwork_status(self, obj):
        if hasattr(obj, "artwork") and obj.artwork:
            return obj.artwork.status
        return None


class QuoteRequestDetailSerializer(ProposalWorkflowMixin, serializers.ModelSerializer):
    client_review_available = serializers.SerializerMethodField()

    def get_client_review_available(self, obj):
        return obj.proposal_stage in {'sent', 'returned'} and bool(obj.proposal_sent_at)

    vat_exemption = serializers.SerializerMethodField()

    def get_vat_exemption(self, obj):
        request = self.context.get("request")
        if not request or not has_staff_capability(request.user, StaffCapability.MANAGE_QUOTES):
            return None
        from .vat import current_evidence
        evidence = current_evidence(obj)
        return {"reason": obj.vat_exemption_reason, "evidence": {
            "id": evidence.pk, "name": evidence.name, "uploaded_at": evidence.created_at,
            "uploaded_by": (evidence.uploaded_by.get_full_name() or evidence.uploaded_by.email) if evidence.uploaded_by else "",
        } if evidence else None}
    workdesk = serializers.SerializerMethodField()
    operational_order_status = serializers.CharField(source="order.status", default=None, read_only=True)
    proposal_workflow = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    tax_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    discount_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True, coerce_to_string=False
    )
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True, coerce_to_string=False
    )
    reception = serializers.SerializerMethodField()
    request_attachments = serializers.SerializerMethodField()
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
    final_price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = QuoteRequest
        fields = [
            "id",
            "reference",
            "proposal_workflow",
            "client_review_available",
            "user",
            "client_name",
            "client_email",
            "client_phone",
            "client_company",
            "client_nuit",
            "contact_source",
            "contact_source_display",
            "urgency",
            "urgency_display",
            "notes",
            "briefing",
            "request_attachments",
            "internal_notes",
            "reception",
            "workdesk",
            "operational_order_status",
            "status",
            "status_display",
            "estimated_price",
            "final_price",
            "price_approved_at",
            "price_approved_by_name",
            "price_approval_comment",
            "valid_until",
            "billing_address",
            "discount_type",
            "discount_percentage",
            "discount_amount",
            "tax_rate",
            "tax_amount",
            "subtotal",
            "commercial_pricing",
            "vat_exempt",
            "vat_exemption",
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
        read_only_fields = [
            "reference",
            "user",
            "status",
            "estimated_price",
            "final_price",
            "billing_address",
            "discount_type",
            "commercial_pricing",
        ]

    def get_price_approved_by_name(self, obj):
        if obj.price_approved_by:
            return obj.price_approved_by.get_full_name() or obj.price_approved_by.email
        return None

    def get_request_attachments(self, obj):
        request = self.context.get("request")
        queryset = obj.request_attachments.all()
        if not request or not (
            has_staff_capability(request.user, StaffCapability.MANAGE_RECEPTION)
            or has_staff_capability(request.user, StaffCapability.MANAGE_QUOTES)
        ):
            queryset = queryset.filter(is_internal=False)
        return list(queryset.values("id", "name", "size"))

    def get_internal_notes(self, obj):
        request = self.context.get("request")
        if (
            request
            and request.user.is_authenticated
            and (
                has_staff_capability(request.user, StaffCapability.MANAGE_QUOTES)
                or has_staff_capability(request.user, StaffCapability.MANAGE_ARTWORK)
            )
        ):
            return obj.internal_notes
        return None

    def get_reception(self, obj):
        from apps.core.reception_briefing import reception_briefing

        request = self.context.get("request")
        if not request or not (
            has_staff_capability(request.user, StaffCapability.MANAGE_RECEPTION)
            or has_staff_capability(request.user, StaffCapability.MANAGE_QUOTES)
        ):
            return None
        return {
            "briefing": reception_briefing(obj),
            "owner_name": (obj.reception_owner.get_full_name() or obj.reception_owner.username)
            if obj.reception_owner
            else "",
            "notes": obj.reception_notes,
            "completed_at": obj.reception_completed_at,
        }

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
    from .material_briefing import MaterialBriefingSerializer
    material_briefing = MaterialBriefingSerializer(required=False)

    def validate(self, values):
        from apps.catalog.apparel import validate_distribution
        return validate_distribution(values, catalogue=True)
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
            "material_briefing",
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
            "client_nuit",
            "urgency",
            "notes",
            "items",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        items_data = validated_data.pop("items", [])
        quote = QuoteRequest.objects.create(user=user, proposal_stage="draft", **validated_data)

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
                material_briefing=item_data.get('material_briefing', {}),
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
    from .material_briefing import MaterialBriefingSerializer
    material_briefing = MaterialBriefingSerializer(required=False)

    def validate(self, values):
        from apps.catalog.apparel import validate_distribution
        return validate_distribution(values)
    item_id = serializers.IntegerField(required=False, min_value=1)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        required=False,
        allow_null=True,
    )
    description = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    notes = serializers.CharField(required=False, allow_blank=True)


class ManualQuoteCreateSerializer(serializers.Serializer):
    """Create a priced commercial proposal on behalf of a client."""

    contact_source = serializers.ChoiceField(
        choices=QuoteRequest.CONTACT_SOURCE_CHOICES, required=False
    )
    vat_exempt = serializers.BooleanField(required=False)
    vat_exemption_reason = serializers.CharField(max_length=1000, required=False, allow_blank=True)
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
    client_nuit = serializers.CharField(max_length=50, required=False, allow_blank=True)
    billing_address = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    valid_until = serializers.DateField(required=False, allow_null=True)
    terms = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    discount_type = serializers.ChoiceField(choices=["fixed", "percentage"], required=False)
    discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0"), required=False
    )
    discount_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("0"),
        max_value=Decimal("100"),
        required=False,
    )
    tax_rate = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("0"),
        max_value=Decimal("100"),
        required=False,
    )
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
        from apps.core.pricing import document_totals

        from .vat import proposal_tax_rate

        attrs["vat_exempt"] = attrs.get("vat_exempt", getattr(self.instance, "vat_exempt", False))
        attrs["tax_rate"] = proposal_tax_rate(self.instance, attrs["vat_exempt"], attrs.get("tax_rate"))

        subtotal = sum(
            (item["unit_price"] * item["quantity"] for item in attrs["items"]), Decimal("0")
        )
        values = {
            field: attrs.get(field, getattr(self.instance, field, default))
            for field, default in [
                ("discount_type", "fixed"),
                ("discount_amount", 0),
                ("discount_percentage", 0),
                ("tax_rate", 0),
            ]
        }
        try:
            totals = document_totals(subtotal, **values)
        except ValueError as exc:
            raise serializers.ValidationError({"discount_amount": str(exc)}) from exc
        attrs.update(values)
        attrs["discount_amount"] = totals["discount_amount"]
        if values["discount_type"] == "fixed":
            attrs["discount_percentage"] = 0
        attrs["commercial_pricing"] = True
        user = attrs.get("user")
        if user:
            profile = getattr(user, "profile", None)
            attrs["client_name"] = attrs.get("client_name") or user.get_full_name() or user.email
            attrs["client_email"] = attrs.get("client_email") or user.email
            attrs["client_phone"] = attrs.get("client_phone") or getattr(profile, "phone", "")
            attrs.setdefault("client_company", getattr(profile, "company", ""))
            attrs.setdefault("client_nuit", getattr(profile, "nuit", ""))
            attrs.setdefault(
                "billing_address",
                getattr(profile, "billing_address", "") or getattr(profile, "address", ""),
            )
        if not attrs.get("client_name"):
            raise serializers.ValidationError({"client_name": "Indique o nome do cliente."})
        if not (attrs.get("client_email") or attrs.get("client_phone")):
            raise serializers.ValidationError(
                {"client_phone": "Indique pelo menos um telefone ou e-mail."}
            )
        ids = [item["item_id"] for item in attrs["items"] if "item_id" in item]
        if ids and (
            not self.instance
            or len(ids) != len(set(ids))
            or not set(ids).issubset(set(self.instance.items.values_list("id", flat=True)))
        ):
            raise serializers.ValidationError({"items": "Itens inválidos para este pedido."})
        if self.instance:
            removed = self.instance.items.exclude(id__in=ids)
            if any(item.artwork_file for item in removed):
                raise serializers.ValidationError(
                    {"items": "Mantenha os itens com anexos para preservar os ficheiros originais."}
                )
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items")
        # Origin belongs to the original request, not the pricing operation.
        validated_data.pop("contact_source", None)
        existing = {item.id: item for item in instance.items.all()}
        retained = []
        for position, data in enumerate(items_data):
            item_id = data.pop("item_id", None)
            item = existing[item_id] if item_id else QuoteItem(quote=instance)
            from apps.catalog.apparel import validate_distribution
            validate_distribution(data, item)
            if "product" in data and item.product_id != getattr(data["product"], "id", None):
                item.product_variant = None
            for field, value in data.items():
                setattr(item, field, value)
            item.position = position
            item.save()
            retained.append(item.id)
        instance.items.exclude(id__in=retained).delete()
        for field, value in validated_data.items():
            setattr(instance, field, value)
        from apps.core.pricing import document_totals

        subtotal = sum(item["unit_price"] * Decimal(item["quantity"]) for item in items_data)
        instance.final_price = document_totals(
            subtotal,
            instance.discount_type,
            instance.discount_amount,
            instance.discount_percentage,
            instance.tax_rate,
        )["total"]
        instance.estimated_price = instance.final_price
        instance.status = QuoteRequest.STATUS_QUOTED
        instance.save()
        return instance

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        total = sum(item["unit_price"] * Decimal(item["quantity"]) for item in items_data)
        from apps.core.pricing import document_totals

        total = document_totals(
            total,
            validated_data["discount_type"],
            validated_data["discount_amount"],
            validated_data["discount_percentage"],
            validated_data["tax_rate"],
        )["total"]
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
                material_briefing=item.get('material_briefing', {}),
                position=position,
            )
        return quote


class ReceptionIntakeItemSerializer(serializers.Serializer):
    from .material_briefing import MaterialBriefingSerializer
    material_briefing = MaterialBriefingSerializer(required=False)

    def validate(self, values):
        from apps.catalog.apparel import validate_distribution
        return validate_distribution(values)
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

    client_nuit = serializers.CharField(max_length=50, required=False, allow_blank=True)
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
            attrs.setdefault("client_company", getattr(profile, "company", ""))
            attrs.setdefault("client_nuit", getattr(profile, "nuit", ""))
            attrs["delivery_address"] = attrs.get("delivery_address") or getattr(
                profile, "address", ""
            )

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
        total = sum(item["unit_price"] * Decimal(item["quantity"]) for item in priced_items)
        quote = QuoteRequest.objects.create(
            **validated_data,
            proposal_stage="draft" if outcome == self.OUTCOME_QUOTE else "legacy",
            status=(
                QuoteRequest.STATUS_QUOTED
                if outcome == self.OUTCOME_CONFIRMED_ORDER
                else QuoteRequest.STATUS_RECEIVED
            ),
            estimated_price=total if priced_items else None,
            final_price=(total if outcome == self.OUTCOME_CONFIRMED_ORDER else None),
        )
        for position, item in enumerate(items_data):
            QuoteItem.objects.create(
                quote=quote,
                product=item.get("product"),
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item.get("unit_price"),
                notes=item.get("notes", ""),
                material_briefing=item.get('material_briefing', {}),
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
            "client_name",
            "client_company",
            "client_nuit",
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

    def validate(self, attrs):
        if (
            self.instance
            and self.instance.commercial_pricing
            and ("final_price" in attrs or "estimated_price" in attrs)
        ):
            raise serializers.ValidationError(
                "Altere os materiais, descontos e IVA em Preparar proposta para manter os totais consistentes."
            )
        return attrs

    def validate_status(self, value):
        if self.instance and not self.instance.can_transition_to(value):
            raise serializers.ValidationError(
                f"Transição inválida a partir de '{self.instance.get_status_display()}'."
            )
        return value


class ArtworkApprovalSerializer(serializers.ModelSerializer):
    proof_file = serializers.SerializerMethodField()

    def get_proof_file(self, obj):
        latest = obj.quote.proof_versions.filter(published_at__isnull=False).defer('private_content').first()
        if latest and latest.mime_type:
            return f'/api/artwork-files/{latest.pk}/'
        return RelativeFileField().to_representation(obj.proof_file) if obj.proof_file else ''
    status_display = serializers.CharField(source="get_status_display", read_only=True)

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
