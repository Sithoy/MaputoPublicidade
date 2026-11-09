"""Client briefings, without automated pricing or fabricated quantities."""

import json
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from PIL import Image
from rest_framework import serializers
from rest_framework.throttling import UserRateThrottle

from .material_briefing import MaterialBriefingSerializer


def request_payload(request):
    """Keep JSON callers compatible while allowing bounded private multipart evidence."""
    if 'payload' not in request.data:
        return request.data
    try:
        data = json.loads(request.data['payload'])
        if not isinstance(data, dict):
            raise ValueError()
        return data
    except (TypeError, ValueError) as exc:
        raise serializers.ValidationError({'detail': 'Pedido inválido.'}) from exc


class BrandRequestThrottle(UserRateThrottle):
    scope = "brand_request"
    rate = "5/min"


class BrandItemSerializer(serializers.Serializer):
    def validate(self, values):
        from apps.catalog.apparel import validate_distribution
        return validate_distribution(values)
    material_briefing = MaterialBriefingSerializer(required=False)
    description = serializers.CharField(max_length=510)
    quantity = serializers.IntegerField(min_value=1, max_value=1000000)
    specifications = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class BrandRequestSerializer(serializers.Serializer):
    intent = serializers.ChoiceField(
        choices=["quote", "catalogue", "reorder", "campaign", "guidance"]
    )
    project_name = serializers.CharField(max_length=255)
    deadline = serializers.DateField(required=False, allow_null=True)
    fulfilment = serializers.ChoiceField(choices=["pickup", "delivery", "installation"])
    delivery_address = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    source_reference = serializers.CharField(max_length=50, required=False, allow_blank=True)
    needs_design = serializers.BooleanField(default=False)
    urgency = serializers.ChoiceField(choices=["normal", "urgent"], default="normal")
    notes = serializers.CharField(max_length=20000, required=False, allow_blank=True)
    items = BrandItemSerializer(many=True, allow_empty=True)
    library_asset_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), max_length=5, required=False, default=list)

    def validate_library_asset_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Não repita materiais da Biblioteca.')
        return value

    def validate(self, attrs):
        from django.utils import timezone

        if len(attrs["items"]) > 50:
            raise serializers.ValidationError("Use até 50 materiais por pedido.")
        if not attrs["items"] and not attrs.get("notes"):
            raise serializers.ValidationError(
                "Descreva a necessidade ou adicione pelo menos um material."
            )
        if attrs["intent"] == "reorder" and not attrs.get("source_reference"):
            raise serializers.ValidationError("Indique a referência anterior.")
        if attrs.get("deadline") and attrs["deadline"] < timezone.localdate():
            raise serializers.ValidationError("A data pretendida não pode estar no passado.")
        return attrs


def validated_attachments(files):
    """Validate before any database writes; reject active formats and oversize archives."""
    if len(files) > 5 or sum(file.size for file in files) > 3 * 1024 * 1024:
        raise serializers.ValidationError({"detail": "Use até 5 anexos e 3 MB no total."})
    results = []
    for file in files:
        name = Path(file.name.replace("\\", "/")).name[:255]
        extension = Path(name).suffix.lower()
        data = file.read()
        if not data or len(data) > 2 * 1024 * 1024:
            raise serializers.ValidationError({"detail": "Cada anexo deve ter conteúdo e até 2 MB."})
        try:
            if extension in {".png", ".jpg", ".jpeg", ".webp"}:
                with Image.open(BytesIO(data)) as image:
                    expected = {".png": "PNG", ".jpg": "JPEG", ".jpeg": "JPEG", ".webp": "WEBP"}[
                        extension
                    ]
                    if image.format != expected or image.width * image.height > 20000000:
                        raise ValueError()
                    image.verify()
            elif extension == ".pdf":
                if not data.startswith(b"%PDF-"):
                    raise ValueError()
            elif extension == ".csv":
                text = data.decode("utf-8-sig")
                if "\x00" in text:
                    raise ValueError()
            elif extension in {".xlsx", ".docx"}:
                with ZipFile(BytesIO(data)) as archive:
                    entries = archive.infolist()
                    required = "xl/workbook.xml" if extension == ".xlsx" else "word/document.xml"
                    if (
                        required not in archive.namelist()
                        or len(entries) > 1000
                        or sum(entry.file_size for entry in entries) > 20 * 1024 * 1024
                        or any("vbaProject" in entry.filename for entry in entries)
                    ):
                        raise ValueError()
            else:
                raise ValueError()
        except (ValueError, OSError, BadZipFile, Image.DecompressionBombError) as exc:
            raise serializers.ValidationError({
                "detail": f"Anexo inválido: {name}. Use PDF, imagens, CSV, XLSX ou DOCX."
            }) from exc
        results.append({"name": name, "size": len(data), "content": data})
    return results
