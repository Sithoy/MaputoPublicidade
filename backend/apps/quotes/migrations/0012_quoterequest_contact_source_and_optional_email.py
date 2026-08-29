from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("quotes", "0011_quoterequest_delivery_and_payment"),
    ]

    operations = [
        migrations.AddField(
            model_name="quoterequest",
            name="contact_source",
            field=models.CharField(
                choices=[
                    ("walk_in", "Atendimento presencial"),
                    ("phone", "Chamada telefónica"),
                    ("whatsapp", "WhatsApp"),
                    ("email", "E-mail"),
                    ("web", "Website"),
                ],
                default="web",
                max_length=20,
                verbose_name="origem do atendimento",
            ),
        ),
        migrations.AlterField(
            model_name="quoterequest",
            name="client_email",
            field=models.EmailField(blank=True, max_length=254, verbose_name="email do cliente"),
        ),
    ]
