from django.core.management.base import BaseCommand

from apps.core.observability import purge_monitoring


class Command(BaseCommand):
    help = 'Remove operational counters/alerts older than 30 days and grouped incidents older than 14 days.'

    def handle(self, *args, **options):
        purge_monitoring()
        self.stdout.write(self.style.SUCCESS('Operational monitoring retention applied.'))
