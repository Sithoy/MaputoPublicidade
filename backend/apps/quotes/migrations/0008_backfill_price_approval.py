from django.db import migrations


def backfill_price_approval(apps, schema_editor):
    """Quotes converted before approval provenance existed get the order's
    creation date as the approval timestamp, so they remain consistent with
    the conversion gate introduced in 0007."""
    QuoteRequest = apps.get_model("quotes", "QuoteRequest")
    for quote in QuoteRequest.objects.filter(
        price_approved_at__isnull=True, order__isnull=False
    ).select_related("order"):
        quote.price_approved_at = quote.order.created_at
        quote.price_approval_comment = (
            "Aprovação anterior à introdução do registo de aprovações."
        )
        quote.save(update_fields=["price_approved_at", "price_approval_comment"])


class Migration(migrations.Migration):

    dependencies = [
        ("quotes", "0007_quoterequest_price_approval_comment_and_more"),
        ("orders", "0005_alter_order_user"),
    ]

    operations = [
        migrations.RunPython(backfill_price_approval, migrations.RunPython.noop),
    ]
