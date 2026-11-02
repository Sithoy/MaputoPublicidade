"""One technical queue from accepted order to completed production. No finance."""
from django.utils import timezone

from .studio import readiness
from .studio_queue import studio_task


def operations_agenda(quotes):
    now = timezone.now()
    rows = []
    priority = {'revisions': 0, 'preparation': 1, 'new': 2, 'draft': 3,
                'ready': 4, 'production': 5, 'approval': 6, 'delivery': 7}
    for quote in quotes:
        operation = readiness(quote)
        if operation['stage'] in {'awaiting_order', 'closed'}:
            continue
        art = studio_task(quote, now)
        items = list(quote.items.all())
        missing = operation['missing']
        task = art['task'] if art else operation['stage']
        if operation['stage'] == 'preparation':
            task = 'preparation'
        rows.append({
            'reference': quote.reference,
            'client_name': quote.client_company or quote.client_name,
            'description': ' · '.join(item.description for item in items),
            'task': task,
            'followup': bool(art and art['followup']),
            'scheduled_date': quote.order.scheduled_date,
            'needs_art': operation['needs_art'],
            'missing': missing,
        })
    rows.sort(key=lambda row: (not row['followup'], priority[row['task']],
                               str(row['scheduled_date'] or '9999'), row['reference']))
    counts = {key: sum(row['task'] == key for row in rows) for key in priority}
    counts.update(all=len(rows), followup=sum(row['followup'] for row in rows))
    return rows, counts, now
