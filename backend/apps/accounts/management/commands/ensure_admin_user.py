import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


def truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


class Command(BaseCommand):
    help = "Ensure the production administrator account exists and can sign in."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-reset-password",
            action="store_true",
            help="Keep the existing admin password even when ADMIN_PASSWORD is configured.",
        )

    def handle(self, *args, **options):
        email = os.getenv("ADMIN_EMAIL", "admin@maputopublicidade.co.mz").strip().lower()
        password = os.getenv("ADMIN_PASSWORD", "admin12345")
        username = os.getenv("ADMIN_USERNAME", "admin").strip() or "admin"
        first_name = os.getenv("ADMIN_FIRST_NAME", "Administrador").strip()
        last_name = os.getenv("ADMIN_LAST_NAME", "Maputo Publicidade").strip()
        reset_password = truthy(os.getenv("ADMIN_RESET_PASSWORD", "true"))

        if not email:
            raise CommandError("ADMIN_EMAIL cannot be empty.")
        if not password:
            raise CommandError("ADMIN_PASSWORD cannot be empty.")

        user_model = get_user_model()

        with transaction.atomic():
            user = user_model.objects.filter(email__iexact=email).first()
            created = user is None

            if created:
                user = user_model(username=self.unique_username(user_model, username), email=email)
            elif not user.username:
                user.username = self.unique_username(user_model, username)

            user.email = email
            if first_name and not user.first_name:
                user.first_name = first_name
            if last_name and not user.last_name:
                user.last_name = last_name

            user.is_active = True
            user.is_staff = True
            user.is_superuser = True

            password_updated = created or (reset_password and not options["no_reset_password"])
            if password_updated:
                user.set_password(password)

            user.save()

        action = "created" if created else "updated"
        password_note = "password reset" if password_updated else "password preserved"
        self.stdout.write(
            self.style.SUCCESS(
                f"Admin user {action}: {email} ({password_note}, staff/superuser enabled)."
            )
        )

    def unique_username(self, user_model, base_username):
        candidate = base_username
        suffix = 1

        while user_model.objects.filter(username__iexact=candidate).exists():
            suffix += 1
            candidate = f"{base_username}{suffix}"

        return candidate
