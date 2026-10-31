"""Technical-only Studio agenda. No commercial fields or invented deadlines."""
from datetime import timedelta

from django.utils import timezone

from .studio import latest_proof, readiness


def studio_task(quote, now):
    operation = readiness(quote)
    if not operation['needs_art'] or operation['stage'] not in {'studio', 'client_art', 'ready'}:
        return None
    latest = latest_proof(quote)
    task = 'new'
    if operation['art_ready']:
        task = 'ready'
    elif operation['stage'] == 'client_art':
        task = 'approval'
    elif latest and latest.client_decision == 'changes_requested':
        task = 'revisions'
    elif latest:
        task = 'draft'
    followup = bool(task == 'approval' and latest.published_at <= now - timedelta(days=3))
    return {
        'reference': quote.reference,
        'client_name': quote.client_company or quote.client_name,
        'description': ' · '.join(item.description for item in quote.items.all()),
        'task': task,
        'followup': followup,
        'scheduled_date': quote.order.scheduled_date,
        'version': latest.version if latest else None,
        'published_at': latest.published_at if latest else None,
        'client_comment': latest.client_comment if task == 'revisions' else '',
    }


def studio_agenda(quotes):
    now = timezone.now()
    rows = [row for quote in quotes if (row := studio_task(quote, now))]
    priority = {'revisions': 0, 'new': 1, 'draft': 2, 'approval': 3, 'ready': 4}
    rows.sort(key=lambda row: (not row['followup'], priority[row['task']], str(row['scheduled_date'] or '9999')))
    counts = {key: sum(row['task'] == key for row in rows) for key in priority}
    counts.update(all=len(rows), followup=sum(row['followup'] for row in rows))
    return rows, counts, now
