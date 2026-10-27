from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db import migrations, models
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone


def preserve_recorded_counts(apps, schema_editor):
    events = apps.get_model('core', 'TrafficEvent').objects.using(schema_editor.connection.alias)
    counters = apps.get_model('core', 'TrafficCounter').objects.using(schema_editor.connection.alias)
    rows = events.filter(created_at__gte=timezone.now() - timedelta(days=90)).exclude(kind='signup_completed').annotate(
        day=TruncDate('created_at', tzinfo=ZoneInfo('Africa/Maputo')),
    ).values('day', 'path', 'kind').annotate(total=Count('id'))
    for row in rows.iterator(chunk_size=500):
        counters.update_or_create(day=row['day'], path=row['path'], kind=row['kind'], defaults={'count': row['total']})


class Migration(migrations.Migration):
    dependencies = [('core', '0017_trafficevent')]
    operations = [
        migrations.CreateModel(name='TrafficCounter', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('day', models.DateField(db_index=True)),
            ('path', models.CharField(max_length=180)),
            ('kind', models.CharField(max_length=24)),
            ('count', models.PositiveBigIntegerField(default=0)),
        ], options={'constraints': [models.UniqueConstraint(fields=('day', 'path', 'kind'), name='unique_traffic_counter')]}),
        migrations.RunPython(preserve_recorded_counts, migrations.RunPython.noop),
    ]
