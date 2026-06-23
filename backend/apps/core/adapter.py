from __future__ import annotations

from allauth.account.adapter import DefaultAccountAdapter
from allauth.headless.adapter import DefaultHeadlessAdapter
from django.contrib.auth import get_user_model

User = get_user_model()


class AccountAdapter(DefaultAccountAdapter):
    """Custom account adapter used for regular allauth account operations."""

    def save_user(self, request, user, form, commit=True):
        """Make sure new sign-ups are not staff/superusers by default."""
        user = super().save_user(request, user, form, commit=False)
        user.is_staff = False
        user.is_superuser = False
        if commit:
            user.save()
        return user


class HeadlessAdapter(DefaultHeadlessAdapter):
    """Customize headless API responses to include staff status."""

    def serialize_user(self, user):
        data = super().serialize_user(user)
        data["is_staff"] = getattr(user, "is_staff", False)
        data["is_superuser"] = getattr(user, "is_superuser", False)
        return data
