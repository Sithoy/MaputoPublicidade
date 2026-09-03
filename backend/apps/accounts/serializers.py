from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.core.fields import (
    MAX_DATA_URL_IMAGE_BYTES,
    PersistedImageSerializerMixin,
    PersistentImageField,
)

from .models import ClientProfile
from .roles import (
    StaffRole,
    get_role_display,
    get_staff_capabilities,
    get_staff_role,
)


class ClientProfileSerializer(PersistedImageSerializerMixin, serializers.ModelSerializer):
    persisted_image_field = "company_logo"
    persisted_image_data_url_field = "company_logo_data_url"

    company_logo = PersistentImageField(
        required=False,
        allow_null=True,
        data_url_field="company_logo_data_url",
    )
    remove_company_logo = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    class Meta:
        model = ClientProfile
        fields = [
            "company",
            "company_logo",
            "remove_company_logo",
            "phone",
            "nuit",
            "website",
            "address",
            "billing_address",
        ]

    def validate_company_logo(self, value):
        if value and value.size > MAX_DATA_URL_IMAGE_BYTES:
            raise serializers.ValidationError("O logótipo deve ter no máximo 2 MB.")
        return value

    def _remove_logo_if_requested(self, instance, remove_logo):
        if not remove_logo:
            return instance
        instance.company_logo = ""
        instance.company_logo_data_url = ""
        instance.save(
            update_fields=["company_logo", "company_logo_data_url", "updated_at"]
        )
        return instance

    def create(self, validated_data):
        remove_logo = validated_data.pop("remove_company_logo", False)
        instance = super().create(validated_data)
        return self._remove_logo_if_requested(instance, remove_logo)

    def update(self, instance, validated_data):
        remove_logo = validated_data.pop("remove_company_logo", False)
        instance = super().update(instance, validated_data)
        return self._remove_logo_if_requested(instance, remove_logo)


class UserSerializer(serializers.ModelSerializer):
    profile = ClientProfileSerializer()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    role = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    capabilities = serializers.SerializerMethodField()

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
            "role",
            "role_display",
            "capabilities",
            "profile",
        ]
        read_only_fields = ["id", "username"]

    def get_role(self, obj):
        return get_staff_role(obj)

    def get_role_display(self, obj):
        return get_role_display(get_staff_role(obj))

    def get_capabilities(self, obj):
        return sorted(get_staff_capabilities(obj))

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        instance = super().update(instance, validated_data)
        profile, _ = ClientProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class ClientProfileAdminSerializer(ClientProfileSerializer):
    pass


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
    staff_role = serializers.ChoiceField(
        choices=StaffRole.assignable_choices(),
        required=False,
        allow_blank=True,
        write_only=True,
    )
    role = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    capabilities = serializers.SerializerMethodField()

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
            "staff_role",
            "role",
            "role_display",
            "capabilities",
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
            "role",
            "role_display",
            "capabilities",
            "date_joined",
            "last_login",
            "order_count",
            "quote_count",
        ]

    def get_role(self, obj):
        return get_staff_role(obj)

    def get_role_display(self, obj):
        return get_role_display(get_staff_role(obj))

    def get_capabilities(self, obj):
        return sorted(get_staff_capabilities(obj))

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

        is_staff = attrs.get(
            "is_staff",
            self.instance.is_staff if self.instance is not None else False,
        )
        existing_role = (
            getattr(getattr(self.instance, "profile", None), "staff_role", "")
            if self.instance is not None
            else ""
        )
        staff_role = attrs.get("staff_role", existing_role)
        if is_staff and not staff_role:
            attrs["staff_role"] = StaffRole.ADMINISTRATOR
        if not is_staff:
            attrs["staff_role"] = ""

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
        staff_role = validated_data.pop("staff_role", "")
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
        profile.staff_role = staff_role if user.is_staff else ""
        profile.save()
        user.profile = profile
        self._sync_verified_email(user)
        user.order_count = 0
        user.quote_count = 0
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        staff_role = validated_data.pop(
            "staff_role", getattr(getattr(instance, "profile", None), "staff_role", "")
        )
        validated_data.pop("password", None)
        validated_data.pop("password_confirm", None)
        instance = super().update(instance, validated_data)
        profile, _ = ClientProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.staff_role = staff_role if instance.is_staff else ""
        profile.save()
        instance.profile = profile
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
