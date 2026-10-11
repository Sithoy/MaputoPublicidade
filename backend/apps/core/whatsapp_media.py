"""Bounded authenticated media proxy. No provider URL or bearer token reaches the browser."""

import base64
import hashlib
import re
from urllib.parse import urlsplit

import requests
from django.http import HttpResponse
from rest_framework.exceptions import ValidationError

from .whatsapp import connection, credentials, graph

LIMIT = 20 * 1024 * 1024
PREVIEW_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


def media_response(message):
    config = connection()
    media_id = str(message.attachment.get("id", ""))
    if not config.enabled or not re.fullmatch(r"[0-9]{1,30}", media_id):
        raise ValidationError("Anexo indisponível ou integração desativada.")
    meta = graph(
        config, "GET", media_id, params={"phone_number_id": config.details["phone_number_id"]}
    )
    url = meta.get("url", "")
    try:
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname != "lookaside.fbsbx.com"
            or parsed.port not in {None, 443}
            or parsed.username
            or parsed.password
            or not parsed.path.startswith("/whatsapp_business/attachments/")
        ):
            raise ValueError()
        mime = meta.get("mime_type", "")
        if mime not in PREVIEW_TYPES or int(meta.get("file_size", LIMIT + 1)) > LIMIT:
            raise ValueError()
        token = credentials(config).get("access_token", "")
        with requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
            allow_redirects=False,
            stream=True,
        ) as response:
            if response.status_code != 200:
                raise ValueError()
            content = bytearray()
            for chunk in response.iter_content(64 * 1024):
                content.extend(chunk)
                if len(content) > LIMIT:
                    raise ValueError()
        signatures = {
            "image/jpeg": content.startswith(b"\xff\xd8\xff"),
            "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
            "application/pdf": content.startswith(b"%PDF-"),
        }
        expected = message.attachment.get("sha256") or meta.get("sha256")
        digest = hashlib.sha256(content)
        if (
            not signatures[mime]
            or expected
            and expected not in {digest.hexdigest(), base64.b64encode(digest.digest()).decode()}
        ):
            raise ValueError()
    except (requests.RequestException, ValueError, TypeError):
        raise ValidationError(
            "Não foi possível consultar o anexo. Pode ter expirado, ultrapassar 20 MB ou ter um formato não suportado."
        ) from None
    result = HttpResponse(bytes(content), content_type=mime)
    result["Cache-Control"] = "private, no-store"
    result["X-Content-Type-Options"] = "nosniff"
    result["Content-Security-Policy"] = "sandbox"
    result["Content-Disposition"] = (
        'inline; filename="anexo.pdf"' if mime == "application/pdf" else 'inline; filename="imagem"'
    )
    return result
