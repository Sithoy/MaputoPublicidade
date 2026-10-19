import os

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create explicitly configured development accounts; never allowed in production."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Test accounts are disabled outside DEBUG development environments.")
        if os.getenv("SEED_TEST_USERS", "").lower() not in {"1", "true", "yes"}:
            self.stdout.write("SEED_TEST_USERS is not enabled.")
            return
        accounts = [
            ("testadmin", "testadmin@maputopublicidade.co.mz", True, "SEED_TEST_ADMIN_PASSWORD"),
            ("cliente", "cliente@maputopublicidade.co.mz", False, "SEED_TEST_CLIENT_PASSWORD"),
        ]
        # Validate all configuration before changing any account.
        for _, _, _, key in accounts:
            secret = os.getenv(key)
            if not secret:
                raise CommandError(f"Configure {key} locally; there is no default password.")
            validate_password(secret)
        user_model = get_user_model()
        for username, email, staff, key in accounts:
            user, _ = user_model.objects.get_or_create(email__iexact=email, defaults={"username": username, "email": email})
            user.is_active = True
            user.is_staff = staff
            user.is_superuser = staff
            user.set_password(os.environ[key])
            user.save()
            EmailAddress.objects.update_or_create(user=user, email__iexact=email, defaults={"email": email, "primary": True, "verified": True})
            self.stdout.write(self.style.SUCCESS(f"Configured development account: {email}"))
