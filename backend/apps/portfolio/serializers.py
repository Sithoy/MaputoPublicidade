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


class PartnerSerializer(serializers.ModelSerializer):
    logo = RelativeImageField(required=False)

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
