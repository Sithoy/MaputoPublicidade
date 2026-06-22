from django.contrib.auth.models import User
from rest_framework import serializers

from .models import ClientProfile


class ClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ["company", "phone", "nuit", "address", "billing_address"]


class UserSerializer(serializers.ModelSerializer):
    profile = ClientProfileSerializer()
    is_staff = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
            "profile",
        ]
        read_only_fields = ["id", "username"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        instance = super().update(instance, validated_data)
        profile, _ = ClientProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class ClientProfileAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ["company", "phone", "nuit", "address", "billing_address"]


class UserAdminSerializer(serializers.ModelSerializer):
    profile = ClientProfileAdminSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
            "date_joined",
            "profile",
        ]
        read_only_fields = ["id", "username", "date_joined"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        instance = super().update(instance, validated_data)
        profile, _ = ClientProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance
