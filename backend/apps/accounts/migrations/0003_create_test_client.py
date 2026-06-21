# Test-only client migration — kept empty to preserve migration history.

from django.db import migrations


def noop(apps, schema_editor):
    # Test-only client creation removed before launch.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_create_default_admin"),
    ]

    operations = [
        migrations.RunPython(noop, noop),
    ]
