import mimetypes
from pathlib import PurePosixPath
from uuid import uuid4

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
            "file_name",
            "file_mime_type",
            "file_size",
            "description",
            "brand_colors",
            "uploaded_by_name",
            "created_at",
            "approval_record",
        ]
        read_only_fields = [
            "user",
            "uploaded_by_name",
            "created_at",
            "file_name",
            "file_mime_type",
            "file_size",
            "approval_record",
        ]

    def validate_file(self, value):
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("O ficheiro deve ter no máximo 10 MB.")
        return value

    def create(self, validated_data):
        upload = validated_data.pop("file")
        filename = PurePosixPath(upload.name.replace("\\", "/")).name[:255]
        content = upload.read(10 * 1024 * 1024 + 1)
        if len(content) > 10 * 1024 * 1024:
            raise serializers.ValidationError({"file": "O ficheiro deve ter no máximo 10 MB."})
        validated_data.update(
            file=f"private/brand_assets/{uuid4().hex}",
            private_content=content,
            file_name=filename,
            file_mime_type=mimetypes.guess_type(filename)[0] or "application/octet-stream",
            file_size=len(content),
        )
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.file:
            data["file"] = f"/api/brand-assets/{instance.pk}/file/"
            data["file_name"] = instance.file_name or instance.file.name.rsplit("/", 1)[-1]
            data["file_mime_type"] = (
                instance.file_mime_type
                or mimetypes.guess_type(data["file_name"])[0]
                or "application/octet-stream"
            )
        return data

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return None
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
