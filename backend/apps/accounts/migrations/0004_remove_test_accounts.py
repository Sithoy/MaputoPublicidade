# Generated manually — remove test-only accounts before production launch.

from django.db import migrations


TEST_EMAILS = [
    "admin@maputopublicidade.co.mz",
    "cliente@maputopublicidade.co.mz",
]


def remove_test_accounts(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(email__in=TEST_EMAILS).delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_create_test_client"),
    ]

    operations = [
        migrations.RunPython(remove_test_accounts, noop),
    ]
