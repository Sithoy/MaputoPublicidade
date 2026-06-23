from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    provider_display = serializers.CharField(
        source="get_provider_display", read_only=True
    )
    recorded_by_name = serializers.CharField(
        source="recorded_by.get_full_name", read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "amount",
            "method",
            "method_display",
            "provider",
            "provider_display",
            "provider_transaction_id",
            "correlation_id",
            "phone_number",
            "reference_code",
            "status",
            "status_display",
            "provider_payload",
            "recorded_by",
            "recorded_by_name",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "order",
            "recorded_by",
            "provider",
            "provider_transaction_id",
            "correlation_id",
            "provider_payload",
        ]


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "amount",
            "method",
            "reference_code",
            "status",
            "notes",
        ]


class PaymentInitiateSerializer(serializers.Serializer):
    order_reference = serializers.CharField(required=True)
    method = serializers.ChoiceField(
        choices=[Payment.METHOD_MPESA, Payment.METHOD_EMOLA]
    )
    phone_number = serializers.CharField(required=True, max_length=20)
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
