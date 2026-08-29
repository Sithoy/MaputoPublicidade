from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0010_clientprofile_staff_role"),
    ]

    operations = [
        migrations.AlterField(
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
                    ("receptionist", "Recepção"),
                ],
                default="",
                max_length=30,
                verbose_name="função da equipa",
            ),
        ),
    ]
