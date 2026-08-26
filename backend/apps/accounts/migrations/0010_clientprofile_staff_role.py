from django.db import migrations, models


def assign_existing_staff_role(apps, schema_editor):
    ClientProfile = apps.get_model("accounts", "ClientProfile")
    ClientProfile.objects.filter(
        user__is_staff=True,
        user__is_superuser=False,
        staff_role="",
    ).update(staff_role="administrator")


def clear_existing_staff_role(apps, schema_editor):
    ClientProfile = apps.get_model("accounts", "ClientProfile")
    ClientProfile.objects.update(staff_role="")


class Migration(migrations.Migration):
    dependencies = [("accounts", "0009_deactivate_legacy_test_users")]

    operations = [
        migrations.AddField(
            model_name="clientprofile",
            name="staff_role",
            field=models.CharField(
                blank=True,
                choices=[
                    ("administrator", "Administrador"),
                    ("commercial", "Comercial"),
                    ("production", "Produção"),
                    ("finance", "Finanças"),
                    ("content", "Conteúdo"),
                ],
                default="",
                max_length=30,
                verbose_name="função da equipa",
            ),
        ),
        migrations.RunPython(assign_existing_staff_role, clear_existing_staff_role),
    ]
