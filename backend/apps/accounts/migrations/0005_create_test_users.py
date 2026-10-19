"""Keep the migration identifier without installing shared demo credentials.

Already-applied databases are unchanged. Test accounts must be explicitly created
outside production, never installed as a side effect of deploying the schema.
"""
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("accounts", "0004_remove_test_accounts")]
    operations = []
