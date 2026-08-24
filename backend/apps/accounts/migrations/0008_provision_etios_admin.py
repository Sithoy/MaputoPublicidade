from django.db import migrations

ADMIN_EMAIL = "admin@etios.net"
ADMIN_PASSWORD_HASH = "pbkdf2_sha256$1000000$aPHfIDbmYuVdeQKSDEitOw$g2uPkGh03xa9GvX5siAeaVqbzL4uwrJXAONr/Ue/ou4="


def provision_etios_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    EmailAddress = apps.get_model("account", "EmailAddress")

    user = User.objects.filter(email__iexact=ADMIN_EMAIL).first()
    if user is None:
        username = "admin_etios"
        suffix = 1
        while User.objects.filter(username__iexact=username).exists():
            suffix += 1
            username = f"admin_etios{suffix}"
        user = User(username=username, email=ADMIN_EMAIL)

    user.email = ADMIN_EMAIL
    user.first_name = user.first_name or "Etios"
    user.last_name = user.last_name or "Administrator"
    user.password = ADMIN_PASSWORD_HASH
    user.is_active = True
    user.is_staff = True
    user.is_superuser = True
    user.save()

    EmailAddress.objects.update_or_create(
        email=ADMIN_EMAIL,
        defaults={"user": user, "primary": True, "verified": True},
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_clientprofile_billing_address"),
    ]

    operations = [
        migrations.RunPython(provision_etios_admin, migrations.RunPython.noop),
    ]
