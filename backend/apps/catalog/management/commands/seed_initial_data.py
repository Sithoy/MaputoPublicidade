import json
from collections import Counter, defaultdict
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


MODEL_ORDER = [
    "catalog.servicecategory",
    "catalog.product",
    "catalog.package",
    "portfolio.portfolioitem",
]

LOOKUP_FIELD = "slug"
SKIPPED_FIELDS = {"created_at", "updated_at"}


class Command(BaseCommand):
    help = (
        "Seed baseline catalog and portfolio data without depending on fixture "
        "primary keys."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--fixture",
            default=str(Path(settings.BASE_DIR) / "fixtures" / "seed.json"),
            help="Path to the JSON fixture used as the baseline data source.",
        )
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help="Update existing rows matched by slug. Default only creates missing rows.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing to the database.",
        )

    def handle(self, *args, **options):
        fixture_path = Path(options["fixture"])
        update_existing = options["update_existing"]
        dry_run = options["dry_run"]

        if not fixture_path.exists():
            raise CommandError(f"Fixture not found: {fixture_path}")

        try:
            entries = json.loads(fixture_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON fixture: {exc}") from exc

        entries_by_model = self._group_entries(entries)
        category_slug_by_fixture_pk = self._category_slug_by_fixture_pk(entries_by_model)
        counts = Counter()

        with transaction.atomic():
            for model_label in MODEL_ORDER:
                for entry in entries_by_model.get(model_label, []):
                    action = self._seed_entry(
                        model_label=model_label,
                        entry=entry,
                        category_slug_by_fixture_pk=category_slug_by_fixture_pk,
                        update_existing=update_existing,
                        dry_run=dry_run,
                    )
                    counts[action] += 1

            if dry_run:
                transaction.set_rollback(True)

        mode = "dry run" if dry_run else "seed"
        self.stdout.write(
            self.style.SUCCESS(
                f"Initial data {mode} complete: "
                f"{counts['created']} created, "
                f"{counts['updated']} updated, "
                f"{counts['kept']} kept."
            )
        )

    def _group_entries(self, entries):
        grouped = defaultdict(list)
        unsupported_count = 0

        for entry in entries:
            model_label = entry.get("model")
            if model_label in MODEL_ORDER:
                grouped[model_label].append(entry)
            else:
                unsupported_count += 1

        if unsupported_count:
            self.stdout.write(f"Skipped {unsupported_count} unsupported fixture rows.")

        return grouped

    def _category_slug_by_fixture_pk(self, entries_by_model):
        mapping = {}

        for entry in entries_by_model.get("catalog.servicecategory", []):
            fixture_pk = entry.get("pk")
            slug = entry.get("fields", {}).get(LOOKUP_FIELD)
            if fixture_pk and slug:
                mapping[fixture_pk] = slug

        return mapping

    def _seed_entry(
        self,
        *,
        model_label,
        entry,
        category_slug_by_fixture_pk,
        update_existing,
        dry_run,
    ):
        model = apps.get_model(model_label)
        fields = dict(entry.get("fields", {}))
        lookup_value = fields.pop(LOOKUP_FIELD, None)

        if not lookup_value:
            raise CommandError(f"Missing slug for {model_label} fixture row.")

        fields = self._normalize_fields(
            model_label=model_label,
            fields=fields,
            category_slug_by_fixture_pk=category_slug_by_fixture_pk,
        )
        lookup = {LOOKUP_FIELD: lookup_value}
        instance = model.objects.filter(**lookup).first()

        if instance:
            if not update_existing:
                return "kept"

            for field, value in fields.items():
                setattr(instance, field, value)

            if not dry_run:
                instance.save()

            return "updated"

        if not dry_run:
            model.objects.create(**lookup, **fields)

        return "created"

    def _normalize_fields(self, *, model_label, fields, category_slug_by_fixture_pk):
        fields = {key: value for key, value in fields.items() if key not in SKIPPED_FIELDS}

        if model_label in {"catalog.product", "portfolio.portfolioitem"}:
            category_fixture_pk = fields.pop("category", None)
            category_slug = category_slug_by_fixture_pk.get(category_fixture_pk)
            fields["category"] = self._get_category(category_slug)

        return fields

    def _get_category(self, slug):
        if not slug:
            return None

        service_category = apps.get_model("catalog.servicecategory")
        return service_category.objects.filter(slug=slug).first()
