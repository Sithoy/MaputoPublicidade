import base64

from rest_framework import serializers


class RelativeImageField(serializers.ImageField):
    """Image field that returns a relative URL path instead of an absolute URL."""

    def to_representation(self, value):
        if not value:
            return None
        return value.url


class RelativeFileField(serializers.FileField):
    """File field that returns a relative URL path instead of an absolute URL."""

    def to_representation(self, value):
        if not value:
            return None
        return value.url


MAX_DATA_URL_IMAGE_BYTES = 2 * 1024 * 1024


def build_data_url(upload):
    content_type = getattr(upload, "content_type", "") or "image/png"
    upload.seek(0)
    encoded = base64.b64encode(upload.read()).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


class PersistentImageField(serializers.ImageField):
    """Image field that can return a DB-persisted data URL before file storage."""

    def __init__(self, *args, data_url_field="image_data_url", **kwargs):
        self.data_url_field = data_url_field
        super().__init__(*args, **kwargs)

    def get_attribute(self, instance):
        return instance

    def to_representation(self, instance):
        data_url = getattr(instance, self.data_url_field, "")
        if data_url:
            return data_url

        value = getattr(instance, self.field_name, None)
        if not value:
            return None
        return value.url


class PersistedImageSerializerMixin:
    persisted_image_field = "image"
    persisted_image_data_url_field = "image_data_url"

    def validate_image(self, value):
        if value and value.size > MAX_DATA_URL_IMAGE_BYTES:
            raise serializers.ValidationError("A imagem deve ter no maximo 2 MB.")
        return value

    def _prepare_persisted_image(self, validated_data):
        if self.persisted_image_field not in validated_data:
            return

        upload = validated_data.pop(self.persisted_image_field)
        validated_data[self.persisted_image_field] = ""
        validated_data[self.persisted_image_data_url_field] = (
            build_data_url(upload) if upload else ""
        )

    def create(self, validated_data):
        self._prepare_persisted_image(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._prepare_persisted_image(validated_data)
        return super().update(instance, validated_data)
