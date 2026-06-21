# Generated manually — remove the old hard-coded test admin before production launch.

from django.db import migrations


def remove_old_test_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(email="admin@maputopublicidade.co.mz").delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_create_test_client"),
    ]

    operations = [
        migrations.RunPython(remove_old_test_admin, noop),
    ]
