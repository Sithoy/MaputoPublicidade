from django.contrib.auth.hashers import make_password
from django.db import migrations

ADMIN_EMAIL = "admin@etios.net"


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
        # Use a trusted reset/provisioning flow, never a reusable source credential.
        user = User(username=username, email=ADMIN_EMAIL, password=make_password(None))
    user.email = ADMIN_EMAIL
    user.first_name = user.first_name or "Etios"
    user.last_name = user.last_name or "Administrator"
    user.is_active = True
    user.is_staff = True
    user.is_superuser = True
    user.save()
    EmailAddress.objects.update_or_create(
        email=ADMIN_EMAIL,
        defaults={"user": user, "primary": True, "verified": True},
    )


class Migration(migrations.Migration):
    dependencies = [("accounts", "0007_clientprofile_billing_address")]
    operations = [migrations.RunPython(provision_etios_admin, migrations.RunPython.noop)]
