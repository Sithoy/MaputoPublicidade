import base64

from rest_framework import serializers

from apps.catalog.models import ServiceCategory
from apps.core.fields import RelativeImageField

from .models import Partner, PortfolioItem


class PortfolioItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.all(),
        required=False,
        allow_null=True,
    )
    image = RelativeImageField(required=False)

    class Meta:
        model = PortfolioItem
        fields = [
            "id",
            "title",
            "slug",
            "category",
            "category_name",
            "image",
            "description",
            "client_name",
            "completion_date",
            "is_featured",
            "is_active",
            "created_at",
        ]


MAX_PARTNER_LOGO_BYTES = 2 * 1024 * 1024


def build_data_url(upload):
    content_type = getattr(upload, "content_type", "") or "image/png"
    upload.seek(0)
    encoded = base64.b64encode(upload.read()).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


class PartnerSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Partner
        fields = [
            "id",
            "name",
            "slug",
            "sector",
            "description",
            "logo",
            "website",
            "display_order",
            "is_featured",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def validate_logo(self, value):
        if value and value.size > MAX_PARTNER_LOGO_BYTES:
            raise serializers.ValidationError("O logotipo deve ter no maximo 2 MB.")
        return value

    def create(self, validated_data):
        logo = validated_data.pop("logo", None)
        partner = Partner(**validated_data)
        if logo:
            partner.logo_data_url = build_data_url(logo)
        partner.save()
        return partner

    def update(self, instance, validated_data):
        logo = validated_data.pop("logo", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if logo:
            instance.logo_data_url = build_data_url(logo)
        instance.save()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["logo"] = instance.logo_data_url
        if not data["logo"] and instance.logo:
            data["logo"] = instance.logo.url
        return data
