from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0011_alter_clientprofile_staff_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="clientprofile",
            name="company_logo",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="uploads/company_logos/",
                verbose_name="logótipo da empresa",
            ),
        ),
        migrations.AddField(
            model_name="clientprofile",
            name="company_logo_data_url",
            field=models.TextField(
                blank=True,
                editable=False,
                verbose_name="logótipo persistido",
            ),
        ),
        migrations.AddField(
            model_name="clientprofile",
            name="website",
            field=models.URLField(blank=True, verbose_name="website"),
        ),
    ]
