# Test-only admin migration — kept empty to preserve migration history.

from django.db import migrations


def noop(apps, schema_editor):
    # Test-only admin creation removed before launch.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(noop, noop),
    ]
