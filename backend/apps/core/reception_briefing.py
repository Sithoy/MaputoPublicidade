"""Staff-completed briefing, kept separate from the client's original message."""

BRIEFING_FIELDS = [
    "project_name",
    "description",
    "deadline",
    "fulfilment",
    "delivery_address",
    "source_reference",
    "needs_design",
    "questions",
]


def reception_briefing(quote):
    original = quote.briefing if isinstance(quote.briefing, dict) else {}
    saved = quote.reception_briefing or {}
    defaults = {
        "description": original.get("notes") or quote.notes,
        "questions": "",
        "delivery_address": "",
    }
    return {
        field: saved.get(
            field,
            original.get(
                field,
                defaults.get(
                    field, False if field == "needs_design" else None if field == "deadline" else ""
                ),
            ),
        )
        for field in BRIEFING_FIELDS
    }
