import os

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Ensure the configured admin user exists with the configured password."

    def handle(self, *args, **options):
        email = os.getenv("ADMIN_EMAIL", "admin@maputopublicidade.co.mz")
        password = os.getenv("ADMIN_PASSWORD")
        reset_password = (
            os.getenv("ADMIN_RESET_PASSWORD", "False").lower() in ("1", "true", "yes")
        )

        if not password:
            self.stdout.write(
                self.style.WARNING(
                    "ADMIN_PASSWORD is not set; skipping admin user creation."
                )
            )
            return

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": "admin",
                "first_name": "Administrador",
                "last_name": "Maputo Publicidade",
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if created or reset_password:
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            EmailAddress.objects.update_or_create(
                user=user,
                email=email,
                defaults={"primary": True, "verified": True},
            )
            action = "Created" if created else "Updated password for"
            self.stdout.write(self.style.SUCCESS(f"{action} admin user {email}."))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Admin user {email} already exists.")
            )
