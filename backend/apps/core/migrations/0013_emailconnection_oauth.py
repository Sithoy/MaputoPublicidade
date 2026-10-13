import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0012_emailconnection'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.AddField(model_name='emailconnection', name='oauth_client_id', field=models.CharField(max_length=200, blank=True)),
        migrations.AddField(model_name='emailconnection', name='oauth_secret', field=models.TextField(blank=True)),
        migrations.AddField(model_name='emailconnection', name='oauth_refresh', field=models.TextField(blank=True)),
        migrations.AddField(model_name='emailconnection', name='oauth_account_id', field=models.CharField(max_length=100, blank=True)),
        migrations.AddField(model_name='emailconnection', name='oauth_state_hash', field=models.CharField(max_length=64, blank=True)),
        migrations.AddField(model_name='emailconnection', name='oauth_state_expires', field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name='emailconnection', name='oauth_actor', field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
    ]
