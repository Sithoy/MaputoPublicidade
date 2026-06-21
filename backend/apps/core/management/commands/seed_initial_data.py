import os

from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.catalog.models import Product, ServiceCategory


class Command(BaseCommand):
    help = "Load initial seed fixtures (categories, products, packages, portfolio, etc.) once."

    def handle(self, *args, **options):
        # Avoid overwriting production edits on every deploy.
        if ServiceCategory.objects.exists() or Product.objects.exists():
            self.stdout.write(
                self.style.WARNING(
                    "Catalog data already exists; skipping seed_initial_data to avoid overwriting changes."
                )
            )
            return

        fixture_path = os.path.join("fixtures", "seed.json")
        if not os.path.exists(fixture_path):
            self.stdout.write(
                self.style.WARNING(f"Fixture not found at {fixture_path}; skipping seed.")
            )
            return

        call_command("loaddata", fixture_path)
        self.stdout.write(self.style.SUCCESS("Seed data loaded successfully."))
