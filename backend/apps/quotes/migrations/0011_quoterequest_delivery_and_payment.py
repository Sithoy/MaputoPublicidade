import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("quotes", "0010_artworkproofversion"),
    ]

    operations = [
        migrations.AddField(
            model_name="quoterequest",
            name="estimated_delivery_days",
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(365),
                ],
                verbose_name="prazo estimado de entrega (dias úteis)",
            ),
        ),
        migrations.AddField(
            model_name="quoterequest",
            name="payment_option",
            field=models.CharField(
                choices=[
                    ("deposit_50", "50% adiantado + 50% na entrega"),
                    ("on_delivery", "100% na entrega"),
                ],
                default="deposit_50",
                max_length=20,
                verbose_name="condição de pagamento",
            ),
        ),
    ]
