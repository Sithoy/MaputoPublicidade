# Generated manually — isolated test accounts for staging/demo use only.

from django.contrib.auth.hashers import make_password
from django.db import migrations

TEST_USERS = [
    {
        "username": "testadmin",
        "email": "testadmin@maputopublicidade.co.mz",
        "password": "admin12345",
        "first_name": "Test",
        "last_name": "Admin",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "cliente",
        "email": "cliente@maputopublicidade.co.mz",
        "password": "cliente12345",
        "first_name": "Cliente",
        "last_name": "Teste",
        "is_staff": False,
        "is_superuser": False,
    },
]


def create_test_users(apps, schema_editor):
    User = apps.get_model("auth", "User")
    for data in TEST_USERS:
        defaults = {
            **data,
            "password": make_password(data["password"]),
        }
        User.objects.update_or_create(email=data["email"], defaults=defaults)


def delete_test_users(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(
        email__in=[u["email"] for u in TEST_USERS]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_remove_test_accounts"),
    ]

    operations = [
        migrations.RunPython(create_test_users, delete_test_users),
    ]
