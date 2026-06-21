import os

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Ensure the configured admin user exists with the configured password."

    def handle(self, *args, **options):
        from django.contrib.auth.models import User

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
            user.password = make_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            action = "Created" if created else "Updated password for"
            self.stdout.write(self.style.SUCCESS(f"{action} admin user {email}."))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Admin user {email} already exists.")
            )
