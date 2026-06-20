# Generated manually — test client user for development/testing only.

from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_test_client(apps, schema_editor):
    User = apps.get_model("auth", "User")
    if not User.objects.filter(email="cliente@maputopublicidade.co.mz").exists():
        User.objects.create(
            username="cliente",
            email="cliente@maputopublicidade.co.mz",
            first_name="Cliente",
            last_name="Teste",
            password=make_password("cliente12345"),
            is_staff=False,
            is_superuser=False,
        )


def delete_test_client(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(email="cliente@maputopublicidade.co.mz").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_create_default_admin"),
    ]

    operations = [
        migrations.RunPython(create_test_client, delete_test_client),
    ]
