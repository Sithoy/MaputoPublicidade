import csv
import io
from typing import Iterable

from django.db.models import QuerySet


def _clean_value(value):
    if value is None:
        return ""
    return str(value)


def generate_csv(queryset: QuerySet, field_map: dict[str, str]) -> io.StringIO:
    """Generate a CSV file from a queryset.

    field_map: { csv_header: attribute_or_callable }
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(field_map.keys())

    for obj in queryset:
        row = []
        for attr in field_map.values():
            if callable(attr):
                row.append(_clean_value(attr(obj)))
            else:
                value = obj
                for part in attr.split("."):
                    value = getattr(value, part, None)
                    if value is None:
                        break
                row.append(_clean_value(value))
        writer.writerow(row)

    output.seek(0)
    return output


def generate_xlsx(queryset: QuerySet, field_map: dict[str, str]) -> io.BytesIO:
    """Generate an Excel file from a queryset."""
    try:
        from openpyxl import Workbook
    except ImportError as exc:
        raise ImportError("openpyxl is required for XLSX export") from exc

    wb = Workbook()
    ws = wb.active
    ws.append(list(field_map.keys()))

    for obj in queryset:
        row = []
        for attr in field_map.values():
            if callable(attr):
                row.append(_clean_value(attr(obj)))
            else:
                value = obj
                for part in attr.split("."):
                    value = getattr(value, part, None)
                    if value is None:
                        break
                row.append(_clean_value(value))
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def export_response(queryset: QuerySet, field_map: dict[str, str], filename: str, fmt: str):
    from django.http import HttpResponse

    if fmt == "xlsx":
        output = generate_xlsx(queryset, field_map)
        response = HttpResponse(
            output.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}.xlsx"'
        return response

    output = generate_csv(queryset, field_map)
    response = HttpResponse(output.read(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}.csv"'
    return response
