from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
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
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        trim_whitespace=False,
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        trim_whitespace=False,
    )
    order_count = serializers.IntegerField(read_only=True)
    quote_count = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(validators=[])

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
            "is_active",
            "date_joined",
            "last_login",
            "profile",
            "password",
            "password_confirm",
            "order_count",
            "quote_count",
        ]
        read_only_fields = [
            "id",
            "username",
            "is_superuser",
            "date_joined",
            "last_login",
            "order_count",
            "quote_count",
        ]

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = User.objects.filter(email__iexact=email)
        email_queryset = EmailAddress.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
            email_queryset = email_queryset.exclude(user=self.instance)
        if queryset.exists() or email_queryset.exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return email

    def validate(self, attrs):
        attrs = super().validate(attrs)
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        if self.instance is None:
            if not password:
                raise serializers.ValidationError(
                    {"password": "Defina uma palavra-passe temporária."}
                )
            if password != password_confirm:
                raise serializers.ValidationError(
                    {"password_confirm": "As palavras-passe não coincidem."}
                )
            validate_password(password)
        elif password or password_confirm:
            raise serializers.ValidationError(
                {"password": "Use a acção de redefinição de palavra-passe."}
            )

        return attrs

    @staticmethod
    def _unique_username(email):
        base = slugify(email.split("@", 1)[0])[:140] or "utilizador"
        candidate = base
        suffix = 2
        while User.objects.filter(username__iexact=candidate).exists():
            suffix_text = str(suffix)
            candidate = f"{base[: 150 - len(suffix_text)]}{suffix_text}"
            suffix += 1
        return candidate

    @staticmethod
    def _sync_verified_email(user):
        EmailAddress.objects.filter(user=user).exclude(email__iexact=user.email).delete()
        email_address = EmailAddress.objects.filter(user=user, email__iexact=user.email).first()
        if email_address is None:
            EmailAddress.objects.create(
                user=user,
                email=user.email,
                verified=True,
                primary=True,
            )
            return
        email_address.email = user.email
        email_address.verified = True
        email_address.primary = True
        email_address.save(update_fields=["email", "verified", "primary"])

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        password = validated_data.pop("password")
        validated_data.pop("password_confirm", None)
        email = validated_data["email"]
        user = User(
            username=self._unique_username(email),
            **validated_data,
        )
        user.set_password(password)
        user.save()
        profile, _ = ClientProfile.objects.get_or_create(user=user)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        self._sync_verified_email(user)
        user.order_count = 0
        user.quote_count = 0
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        validated_data.pop("password", None)
        validated_data.pop("password_confirm", None)
        instance = super().update(instance, validated_data)
        profile, _ = ClientProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        self._sync_verified_email(instance)
        return instance


class AdminPasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_new_password(self, value):
        validate_password(value, self.context.get("user"))
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "As palavras-passe não coincidem."}
            )
        return attrs
