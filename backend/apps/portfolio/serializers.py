from rest_framework import serializers

from apps.core.fields import RelativeImageField

from .models import PortfolioItem


class PortfolioItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
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
