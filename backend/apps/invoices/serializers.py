from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from apps.orders.models import Order

from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01"), coerce_to_string=False
    )
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0"), coerce_to_string=False
    )

    class Meta:
        model = InvoiceItem
        fields = ["id", "description", "quantity", "unit_price", "line_total", "position"]
        read_only_fields = ["id", "line_total"]


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)
    order_reference = serializers.SlugRelatedField(
        queryset=Order.objects.all(),
        source="order",
        slug_field="reference",
        required=False,
        allow_null=True,
    )
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=False, is_active=True),
        source="user",
        required=False,
        allow_null=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    amount_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    balance_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    tax_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
        coerce_to_string=False,
        required=False,
    )
    tax_rate = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("0"),
        max_value=Decimal("100"),
        coerce_to_string=False,
        required=False,
    )

    class Meta:
        model = Invoice
        fields = [
            "id",
            "reference",
            "order_reference",
            "user_id",
            "client_name",
            "client_email",
            "client_phone",
            "client_company",
            "client_nuit",
            "billing_address",
            "issue_date",
            "due_date",
            "status",
            "status_display",
            "currency",
            "subtotal",
            "discount_amount",
            "tax_rate",
            "tax_amount",
            "total",
            "amount_paid",
            "balance_due",
            "notes",
            "terms",
            "items",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "reference",
            "status",
            "currency",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "client_name": {"required": False, "allow_blank": True},
            "client_email": {"required": False, "allow_blank": True},
            "items": {"required": False},
        }

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.email

    def validate(self, attrs):
        issue_date = attrs.get("issue_date", getattr(self.instance, "issue_date", None))
        due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if issue_date and due_date and due_date < issue_date:
            raise serializers.ValidationError(
                {"due_date": "A data de vencimento não pode anteceder a emissão."}
            )
        order = attrs.get("order", getattr(self.instance, "order", None))
        user = attrs.get("user", getattr(self.instance, "user", None))
        if order:
            user = user or order.user
            attrs["user"] = user
        if user:
            profile = getattr(user, "profile", None)
            attrs["client_name"] = attrs.get("client_name") or user.get_full_name() or user.email
            attrs["client_email"] = attrs.get("client_email") or user.email
            attrs["client_phone"] = attrs.get("client_phone") or getattr(profile, "phone", "")
            attrs["client_company"] = attrs.get("client_company") or getattr(profile, "company", "")
            attrs["client_nuit"] = attrs.get("client_nuit") or getattr(profile, "nuit", "")
            attrs["billing_address"] = attrs.get("billing_address") or (
                getattr(profile, "billing_address", "") or getattr(profile, "address", "")
            )
        elif order and order.quote:
            quote = order.quote
            attrs["client_name"] = attrs.get("client_name") or quote.client_name
            attrs["client_email"] = attrs.get("client_email") or quote.client_email
            attrs["client_phone"] = attrs.get("client_phone") or quote.client_phone
            attrs["client_company"] = attrs.get("client_company") or quote.client_company
        client_name = attrs.get(
            "client_name", getattr(self.instance, "client_name", "")
        )
        if not client_name:
            raise serializers.ValidationError({"client_name": "Indique o nome do cliente."})
        items = attrs.get("items")
        if self.instance is None and not items and not order:
            raise serializers.ValidationError({"items": "Adicione pelo menos um item."})
        if self.instance is not None and items is not None and not items:
            raise serializers.ValidationError({"items": "Adicione pelo menos um item."})
        if self.instance is None:
            if items:
                document_subtotal = sum(
                    item["quantity"] * item["unit_price"] for item in items
                )
            elif order:
                document_subtotal = order.final_price or order.estimated_price
            else:
                document_subtotal = Decimal("0")
            if (
                document_subtotal is not None
                and attrs.get("discount_amount", Decimal("0")) > document_subtotal
            ):
                raise serializers.ValidationError(
                    {"discount_amount": "O desconto não pode exceder o subtotal."}
                )
        if self.instance and self.instance.status != Invoice.STATUS_DRAFT:
            raise serializers.ValidationError(
                "Apenas faturas em rascunho podem ser alteradas."
            )
        return attrs

    @staticmethod
    def _items_from_order(order):
        order_items = list(order.items.all())
        if order_items and all(item.unit_price is not None for item in order_items):
            return [
                {
                    "description": item.description or "Serviço",
                    "quantity": Decimal(item.quantity),
                    "unit_price": item.unit_price,
                    "position": position,
                }
                for position, item in enumerate(order_items)
            ]
        total = order.final_price or order.estimated_price
        if total is None:
            raise serializers.ValidationError(
                {"order_reference": "A encomenda ainda não possui um valor faturável."}
            )
        return [
            {
                "description": f"Serviços conforme encomenda {order.reference}",
                "quantity": Decimal("1"),
                "unit_price": total,
                "position": 0,
            }
        ]

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", None)
        invoice = Invoice.objects.create(
            **validated_data,
            created_by=self.context["request"].user,
        )
        if not items_data and invoice.order:
            items_data = self._items_from_order(invoice.order)
        for position, item in enumerate(items_data or []):
            InvoiceItem.objects.create(
                invoice=invoice,
                position=item.get("position", position),
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            )
        invoice.recalculate_totals()
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        instance = super().update(instance, validated_data)
        if items_data is not None:
            instance.items.all().delete()
            for position, item in enumerate(items_data):
                InvoiceItem.objects.create(
                    invoice=instance,
                    position=item.get("position", position),
                    description=item["description"],
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                )
        instance.recalculate_totals()
        return instance


class InvoiceStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Invoice.STATUS_CHOICES)
