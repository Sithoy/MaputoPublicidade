from rest_framework import serializers

from apps.accounts.serializers import ClientProfileSerializer

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
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
            "reference_code",
            "status",
            "status_display",
            "recorded_by",
            "recorded_by_name",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["order", "recorded_by"]


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
