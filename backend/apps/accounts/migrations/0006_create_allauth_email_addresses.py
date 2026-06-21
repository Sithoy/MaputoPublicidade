# Generated manually — create allauth EmailAddress records for existing users.

from django.db import migrations


EMAILS = [
    ("admin@maputopublicidade.co.mz", True),
    ("testadmin@maputopublicidade.co.mz", True),
    ("cliente@maputopublicidade.co.mz", True),
]


def create_email_addresses(apps, schema_editor):
    User = apps.get_model("auth", "User")
    EmailAddress = apps.get_model("account", "EmailAddress")
    for email, verified in EMAILS:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            continue
        EmailAddress.objects.update_or_create(
            user=user,
            email=email,
            defaults={"primary": True, "verified": verified},
        )


def delete_email_addresses(apps, schema_editor):
    EmailAddress = apps.get_model("account", "EmailAddress")
    EmailAddress.objects.filter(
        email__in=[email for email, _ in EMAILS]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_create_test_users"),
        ("account", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_email_addresses, delete_email_addresses),
    ]
