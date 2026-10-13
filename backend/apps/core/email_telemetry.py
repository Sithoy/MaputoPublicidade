"""Exclude credential/authorization routes from external error and trace reporting."""
from urllib.parse import urlparse


def filter_email_event(event, hint):
    url = event.get('request', {}).get('url', '')
    transaction = event.get('transaction', '')
    if urlparse(url).path.startswith('/api/integrations/email/') or '/integrations/email/' in transaction:
        return None
    return event
