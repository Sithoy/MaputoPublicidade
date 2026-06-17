# Generated manually — default admin user for testing only.

from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_default_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    if not User.objects.filter(email="admin@maputopublicidade.co.mz").exists():
        User.objects.create(
            username="admin",
            email="admin@maputopublicidade.co.mz",
            first_name="Administrador",
            last_name="Maputo Publicidade",
            password=make_password("admin12345"),
            is_staff=True,
            is_superuser=True,
        )


def delete_default_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(email="admin@maputopublicidade.co.mz").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_default_admin, delete_default_admin),
    ]
