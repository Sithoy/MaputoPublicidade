"""Private request reference delivery, shared by owner and technical workspaces."""
from io import BytesIO

from django.http import FileResponse
from PIL import Image
from rest_framework.exceptions import ValidationError


def reference_response(file, preview=False):
    content = bytes(file.content)
    content_type = 'application/octet-stream'
    if preview:
        try:
            with Image.open(BytesIO(content)) as image:
                content_type = {'PNG': 'image/png', 'JPEG': 'image/jpeg', 'WEBP': 'image/webp'}.get(image.format)
                if not content_type or image.width * image.height > 20000000:
                    raise ValueError()
                image.verify()
        except (ValueError, OSError, SyntaxError, EOFError, Image.DecompressionBombError) as exc:
            raise ValidationError({'detail': 'Pré-visualização disponível apenas para imagens JPG, PNG e WebP válidas.'}) from exc
    response = FileResponse(BytesIO(content), as_attachment=not preview, filename=file.name, content_type=content_type)
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    response['Content-Security-Policy'] = 'sandbox'
    return response
