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
