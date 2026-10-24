"""Small private correspondence files, persisted independently of Render's disk."""
import hashlib
import io
from pathlib import PurePath

from django.db import transaction
from django.http import HttpResponse
from PIL import Image
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.roles import has_staff_capability

from .models import SupportFile

MAX_FILE = 3 * 1024 * 1024
MAX_TOTAL = 6 * 1024 * 1024


def validate_file(name, content):
    name = PurePath(name.replace('\\', '/')).name[:180]
    if not name or any(ord(char) < 32 for char in name):
        raise ValidationError('Nome de ficheiro inválido.')
    if not content or len(content) > MAX_FILE:
        raise ValidationError('Cada anexo deve ter no máximo 3 MB.')
    suffix = PurePath(name).suffix.lower()
    if suffix == '.pdf' and content.startswith(b'%PDF-'):
        mime = 'application/pdf'
    else:
        try:
            with Image.open(io.BytesIO(content)) as image:
                mime = {'JPEG': 'image/jpeg', 'PNG': 'image/png', 'WEBP': 'image/webp'}[image.format]
                if image.width * image.height > 25_000_000:
                    raise ValueError()
                image.verify()
            if suffix not in {'.jpg', '.jpeg', '.png', '.webp'}:
                raise ValueError()
        except Exception:
            raise ValidationError('Utilize PDF, JPG, PNG ou WebP válidos. SVG e ficheiros executáveis não são aceites.') from None
    return name, mime


def metadata(row):
    return {'id': row.pk, 'name': row.name, 'mime_type': row.mime_type, 'size': row.size,
            'sha256': row.sha256, 'url': f'/api/support-conversations/{row.conversation_id}/files/{row.pk}/'}


def selected_files(conversation, ids, user=None):
    if not isinstance(ids, list) or len(ids) > 3 or any(type(pk) is not int for pk in ids) or len(set(ids)) != len(ids):
        raise ValidationError('Selecione até três anexos distintos.')
    query = SupportFile.objects.defer('content').filter(conversation=conversation, pk__in=ids, message__isnull=True)
    if user:
        query = query.filter(uploaded_by=user)
    rows = list(query.order_by('id'))
    if len(rows) != len(ids) or sum(row.size for row in rows) > MAX_TOTAL:
        raise ValidationError('Anexos indisponíveis ou total superior a 6 MB.')
    for row in rows:
        if row.document_source.get('kind') == 'artwork':
            from .studio import validate_artwork_file
            validate_artwork_file(conversation.quote_id, row.document_source)
        if row.document_source.get('kind') == 'proposal':
            from apps.quotes.models import QuoteRequest
            source = row.document_source
            if not QuoteRequest.objects.filter(pk=source['quote_id'], proposal_version=source['version'], proposal_stage__in=['approved', 'review', 'sent']).exists():
                raise ValidationError('A proposta anexada foi alterada. Guarde e selecione a versão atual.')
    return rows


def file_response(row):
    content = bytes(row.content)
    if row.zoho:
        import requests

        from .zoho_mail import connection, headers
        config = connection()
        parts = row.zoho
        if not config or not config.receiving_enabled or parts.get('account') != config.oauth_account_id or not all(str(parts.get(key, '')).isdigit() for key in ['account', 'folder', 'message', 'attachment']):
            raise ValidationError('Anexo indisponível nesta ligação Zoho.')
        url = f"https://mail.zoho.com/api/accounts/{parts['account']}/folders/{parts['folder']}/messages/{parts['message']}/attachments/{parts['attachment']}"
        try:
            with requests.get(url, headers=headers(config), timeout=10, allow_redirects=False, stream=True) as result:
                result.raise_for_status()
                chunks, size = [], 0
                for chunk in result.iter_content(65536):
                    size += len(chunk)
                    if size > MAX_FILE:
                        raise ValueError()
                    chunks.append(chunk)
                content = b''.join(chunks)
        except Exception:
            raise ValidationError('Não foi possível obter o anexo Zoho. Verifique a ligação e o limite de 3 MB.') from None
        _, mime = validate_file(row.name, content)
        if mime != row.mime_type:
            raise ValidationError('O conteúdo do anexo não corresponde ao formato declarado.')
    response = HttpResponse(content, content_type=row.mime_type)
    response['Content-Disposition'] = 'inline'
    response['X-Content-Type-Options'] = 'nosniff'
    response['Content-Security-Policy'] = "sandbox; default-src 'none'"
    response['Cache-Control'] = 'private, no-store'
    return response


class SupportFilesMixin:
    def document_options(self):
        conversation = self.get_object()
        user = self.request.user
        if not user.is_staff:
            raise PermissionDenied()
        quote = conversation.quote or (conversation.order.quote if conversation.order else None)
        options = []
        if quote and has_staff_capability(user, 'quotes.export') and quote.proposal_stage in ['approved', 'review', 'sent']:
            options.append({'key': 'proposal', 'label': f'Proposta {quote.reference} · v{quote.proposal_version}'})
        if conversation.invoice and has_staff_capability(user, 'invoices.export') and conversation.invoice.status in ['issued', 'paid']:
            options.append({'key': 'invoice', 'label': f'Fatura {conversation.invoice.reference}'})
        if quote and has_staff_capability(user, 'quotes.view'):
            for version in quote.proof_versions.filter(published_at__isnull=False).order_by('-version')[:10]:
                options.append({'key': f'art:{version.pk}', 'label': f'Arte publicada · v{version.version}'})
        return options

    @transaction.atomic
    def attach_document(self, request):
        from .documents import build_invoice_pdf, build_quote_pdf
        from .models import SupportConversation
        conversation = self.get_object()
        if conversation.channel not in ['email', 'branddesk']:
            raise ValidationError('Selecione documentos no editor de Email ou BrandDesk.')
        SupportConversation.objects.select_for_update().get(pk=conversation.pk)
        key = request.data.get('source')
        if key not in [entry['key'] for entry in self.document_options()]:
            raise ValidationError('Documento indisponível ou não autorizado.')
        if conversation.channel == 'email':
            from .email_workspace import get_draft
            if get_draft(conversation).send_state != 'idle':
                raise ValidationError('Aguarde a confirmação do envio.')
        if conversation.files.filter(uploaded_by=request.user, message__isnull=True).count() >= 10:
            raise ValidationError('Existem dez anexos por utilizar nesta conversa.')
        quote = conversation.quote or (conversation.order.quote if conversation.order else None)
        source = {}
        if key == 'proposal':
            content, name = build_quote_pdf(quote), f'Proposta-{quote.reference}-v{quote.proposal_version}.pdf'
            source = {'kind': 'proposal', 'quote_id': quote.pk, 'version': quote.proposal_version}
        elif key == 'invoice':
            content, name = build_invoice_pdf(conversation.invoice), f'Fatura-{conversation.invoice.reference}.pdf'
        else:
            version = quote.proof_versions.get(pk=int(key.split(':')[1]), published_at__isnull=False)
            name = version.file_name or version.file.name.rsplit('/', 1)[-1]
            if version.private_content:
                content = bytes(version.private_content)
            elif version.file:
                with version.file.open('rb') as file:
                    content = file.read(MAX_FILE + 1)
            else:
                raise ValidationError('Ficheiro de arte indisponível.')
        name, mime = validate_file(name, content)
        row = SupportFile.objects.create(conversation=conversation, uploaded_by=request.user, name=name, mime_type=mime,
                                        size=len(content), sha256=hashlib.sha256(content).hexdigest(), content=content, document_source=source)
        return metadata(row)

    @transaction.atomic
    def upload_support_file(self, request):
        from .models import SupportConversation
        conversation = self.get_object()
        if conversation.channel not in ['email', 'branddesk']:
            raise ValidationError('Anexos neste editor estão disponíveis para Email e BrandDesk.')
        SupportConversation.objects.select_for_update().get(pk=conversation.pk)
        if conversation.channel == 'email' and conversation.email_draft.send_state != 'idle':
            raise ValidationError('Aguarde a confirmação do envio antes de anexar ficheiros.')
        pending = conversation.files.filter(message__isnull=True, uploaded_by=request.user)
        # Bound abandoned uploads as well as per-message attachment size.
        if pending.count() >= 10:
            raise ValidationError('Existem dez anexos por utilizar nesta conversa. Utilize os ficheiros existentes.')
        upload = request.FILES.get('file')
        if not upload:
            raise ValidationError('Selecione um ficheiro.')
        content = upload.read(MAX_FILE + 1)
        name, mime = validate_file(upload.name, content)
        row = SupportFile.objects.create(conversation=conversation, uploaded_by=request.user, name=name,
                                        mime_type=mime, size=len(content), sha256=hashlib.sha256(content).hexdigest(), content=content)
        return metadata(row)
