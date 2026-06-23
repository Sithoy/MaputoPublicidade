import os

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


def truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


TEST_USERS = [
    {
        "username": "testadmin",
        "email": "testadmin@maputopublicidade.co.mz",
        "password": "admin12345",
        "first_name": "Teste",
        "last_name": "Administrador",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "cliente",
        "email": "cliente@maputopublicidade.co.mz",
        "password": "cliente12345",
        "first_name": "Cliente",
        "last_name": "Demonstração",
        "is_staff": False,
        "is_superuser": False,
    },
]


class Command(BaseCommand):
    help = "Create local test users for admin and client login (development only)."

    def handle(self, *args, **options):
        if not truthy(os.getenv("SEED_TEST_USERS")):
            self.stdout.write(
                self.style.WARNING(
                    "SEED_TEST_USERS is not enabled. Set SEED_TEST_USERS=True to create test users."
                )
            )
            return

        for data in TEST_USERS:
            user, created = User.objects.get_or_create(
                email__iexact=data["email"],
                defaults={
                    "username": data["username"],
                    "email": data["email"],
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "is_staff": data["is_staff"],
                    "is_superuser": data["is_superuser"],
                    "is_active": True,
                },
            )

            user.is_active = True
            user.is_staff = data["is_staff"]
            user.is_superuser = data["is_superuser"]
            user.set_password(data["password"])
            user.save()

            EmailAddress.objects.update_or_create(
                user=user,
                email__iexact=data["email"],
                defaults={
                    "email": data["email"],
                    "primary": True,
                    "verified": True,
                },
            )

            action = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} test user: {data['email']} / {data['password']}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Test users are ready. Make sure NEXT_PUBLIC_ENABLE_TEST_CREDENTIALS=true in the frontend."
            )
        )
