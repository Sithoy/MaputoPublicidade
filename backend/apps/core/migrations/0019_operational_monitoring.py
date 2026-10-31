from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0018_trafficcounter')]
    operations = [
        migrations.CreateModel(name='MonitoringBucket', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('minute', models.DateTimeField(unique=True)),
            ('requests', models.PositiveBigIntegerField(default=0)),
            ('server_errors', models.PositiveBigIntegerField(default=0)),
            ('denied', models.PositiveBigIntegerField(default=0)),
            ('rate_limited', models.PositiveBigIntegerField(default=0)),
            ('slow', models.PositiveBigIntegerField(default=0)),
            ('total_ms', models.PositiveBigIntegerField(default=0)),
            ('max_ms', models.PositiveIntegerField(default=0)),
        ]),
        migrations.CreateModel(name='MonitoringEvent', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('minute', models.DateTimeField(db_index=True)),
            ('code', models.CharField(max_length=32)),
            ('route', models.CharField(max_length=180)),
            ('method', models.CharField(max_length=8)),
            ('status', models.PositiveSmallIntegerField()),
            ('count', models.PositiveBigIntegerField(default=0)),
            ('request_id', models.UUIDField()),
            ('last_seen', models.DateTimeField()),
        ], options={'constraints': [models.UniqueConstraint(fields=('minute', 'code', 'route', 'method', 'status'), name='unique_monitoring_event')]}),
        migrations.CreateModel(name='MonitoringAlert', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('window', models.DateTimeField()),
            ('code', models.CharField(max_length=32)),
            ('count', models.PositiveBigIntegerField()),
            ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
        ], options={'constraints': [models.UniqueConstraint(fields=('window', 'code'), name='unique_monitoring_alert')]}),
    ]
