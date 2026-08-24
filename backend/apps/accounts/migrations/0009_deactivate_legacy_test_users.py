from django.db import migrations

LEGACY_TEST_EMAILS = [
    "testadmin@maputopublicidade.co.mz",
    "cliente@maputopublicidade.co.mz",
]


def deactivate_legacy_test_users(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(email__in=LEGACY_TEST_EMAILS).update(is_active=False)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0008_provision_etios_admin"),
    ]

    operations = [
        migrations.RunPython(deactivate_legacy_test_users, migrations.RunPython.noop),
    ]
