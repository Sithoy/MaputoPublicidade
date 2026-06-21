from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Load initial seed fixtures (categories, products, packages, portfolio, etc.)"

    def handle(self, *args, **options):
        call_command("loaddata", "fixtures/seed.json")
        self.stdout.write(self.style.SUCCESS("Seed data loaded successfully."))
