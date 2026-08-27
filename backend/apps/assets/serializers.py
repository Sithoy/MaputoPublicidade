from rest_framework import serializers

from apps.core.fields import RelativeFileField

from .models import BrandAsset


class BrandAssetSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    file = RelativeFileField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BrandAsset
        fields = [
            "id",
            "user",
            "name",
            "kind",
            "kind_display",
            "file",
            "description",
            "brand_colors",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = ["user", "uploaded_by_name", "created_at"]

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return None
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
