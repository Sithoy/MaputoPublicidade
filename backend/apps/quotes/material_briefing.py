"""Shared optional context for BrandDesk and Reception material rows."""

from rest_framework import serializers


class MaterialBriefingSerializer(serializers.Serializer):
    work_type = serializers.ChoiceField(
        choices=["other", "paper", "promotional", "vehicle", "space", "signage"], required=False
    )
    needs_dimensions = serializers.BooleanField(required=False)
    dimensions = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    needs_installation = serializers.BooleanField(required=False)
    installation_notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    needs_visit = serializers.BooleanField(required=False)
    visit_notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)

    def to_internal_value(self, data):
        if isinstance(data, dict) and set(data) - set(self.fields):
            raise serializers.ValidationError("Campo não permitido no contexto do material.")
        return super().to_internal_value(data)
