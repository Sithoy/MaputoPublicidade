"""Technical readiness, shared by Studio and every production-start API."""
import hashlib
import json

from rest_framework.exceptions import ValidationError


def requirement(item):
    if item.artwork_requirement is not None:
        return item.artwork_requirement
    return 'studio' if item.needs_design else 'client' if item.artwork_file else 'none'


def technical_fingerprint(quote):
    rows = [{'id': item.pk, 'description': item.description, 'quantity': item.quantity,
             'size': item.size, 'material': item.material, 'colors': item.colors,
             'briefing': item.material_briefing, 'artwork': str(item.artwork_file or ''),
             'requirement': requirement(item)} for item in quote.items.all()]
    return hashlib.sha256(json.dumps(rows, sort_keys=True, default=str).encode()).hexdigest()


def current_proof(quote, version):
    if not version or quote.proof_versions.order_by('-version').first().pk != version.pk:
        return False
    if version.technical_fingerprint:
        return version.technical_fingerprint == technical_fingerprint(quote)
    # Existing approved packages retain compatibility until Studio changes an item route.
    return not any(item.artwork_requirement is not None for item in quote.items.all())


def readiness(quote):
    order = getattr(quote, 'order', None)
    latest = quote.proof_versions.order_by('-version').first()
    needs_art = any(requirement(item) != 'none' for item in quote.items.all()) or bool(latest)
    art_ready = not needs_art or bool(latest and latest.published_at and latest.client_decision == 'approved' and current_proof(quote, latest))
    authorised = bool(order and (quote.price_approved_at or (quote.proposal_stage == 'legacy' and quote.status == 'approved')))
    stage, label = ('ready', 'Pronto para produção') if art_ready else ('client_art', 'Aguardar decisão da arte') if latest and latest.published_at and latest.client_decision == 'pending' and current_proof(quote, latest) else ('studio', 'Preparar / rever arte no Studio')
    if not authorised:
        stage, label = 'awaiting_order', 'Aguardar aceitação do cliente'
    elif order.status in {'in_production', 'ready', 'delivered', 'cancelled'}:
        stage = {'in_production': 'production', 'ready': 'delivery', 'delivered': 'closed', 'cancelled': 'closed'}[order.status]
        label = order.get_status_display()
    return {'stage': stage, 'label': label, 'needs_art': needs_art, 'art_ready': art_ready,
            'can_start': authorised and order.status == 'approved' and art_ready,
            'current_art_version': latest.version if latest else None}


def require_ready(quote):
    legacy_order = quote.proposal_stage == 'legacy' and quote.status == 'approved' and getattr(quote, 'order', None)
    if not quote.price_approved_at and not legacy_order:
        raise ValidationError('A operação depende da aceitação da proposta pelo cliente.')
    if not readiness(quote)['art_ready']:
        raise ValidationError('Conclua o Studio: publique a versão atual de toda a arte necessária e obtenha a aprovação do cliente antes da produção.')


def ensure_studio_editable(quote):
    order = getattr(quote, 'order', None)
    if quote.status == 'cancelled' or (order and order.status != 'approved'):
        raise ValidationError('A arte e os requisitos ficam bloqueados depois do início da produção ou encerramento.')


def validate_artwork_file(quote_id, source):
    from django.utils import timezone

    from apps.quotes.models import ArtworkProofVersion
    version = ArtworkProofVersion.objects.select_related('quote').filter(pk=source.get('version_id'), quote_id=quote_id).first()
    if not version or not version.published_at or version.share_nonce != source.get('nonce') or not version.share_nonce or not version.share_expires_at or version.share_expires_at <= timezone.now() or not current_proof(version.quote, version):
        raise ValidationError('A arte ou o link mudou. Peça ao Studio o envio da versão atual.')


def prepare_artwork_email(quote, version, actor):
    from django.conf import settings
    from django.contrib.auth.models import User

    from apps.accounts.roles import has_staff_capability

    from .activity import record_activity
    from .models import EmailDraft, PortalNotification, SupportConversation, SupportFile
    from .production_views import share_token
    from .support_files import validate_file
    if not quote.client_email:
        raise ValidationError('Confirme o email do cliente com a Recepção.')
    validate_artwork_file(quote.pk, {'version_id': version.pk, 'nonce': version.share_nonce})
    key = hashlib.sha256(f'artwork:{quote.pk}:{version.pk}:{version.share_nonce}'.encode()).hexdigest()
    conversation, _ = SupportConversation.objects.get_or_create(email_thread_key=key, defaults={
        'quote': quote, 'client': quote.user, 'channel': 'email', 'contact_email': quote.client_email,
        'contact_name': (quote.client_company or quote.client_name)[:160], 'subject': f'Arte {quote.reference} v{version.version}', 'status': 'awaiting_team',
    })
    if not EmailDraft.objects.filter(conversation=conversation).exists():
        if version.private_content:
            content = bytes(version.private_content)
        else:
            with version.file.open('rb') as artwork_file:
                content = artwork_file.read()
        package = [(version.file_name or version.file.name.rsplit('/', 1)[-1], content)]
        package.extend((row.file_name, bytes(row.private_content)) for row in version.attachments.order_by('pk'))
        # Never silently attach only part of an approval package.
        attachment_ids = []
        if len(package) <= 3 and all(len(content) <= 3 * 1024 * 1024 for _, content in package) and sum(len(content) for _, content in package) <= 6 * 1024 * 1024:
            for file_name, content in package:
                name, mime = validate_file(file_name, content)
                attachment = SupportFile.objects.create(conversation=conversation, uploaded_by=actor, name=name, mime_type=mime,
                    size=len(content), sha256=hashlib.sha256(content).hexdigest(), content=content,
                    document_source={'kind': 'artwork', 'quote_id': quote.pk, 'version_id': version.pk, 'nonce': version.share_nonce})
                attachment_ids.append(attachment.pk)
        link = f"{getattr(settings, 'TRACKING_SITE_URL', 'https://maputopublicidade.com').rstrip('/')}/arte/rever/{share_token(version)}"
        delivery = 'Os ficheiros seguem em anexo e no link privado.' if attachment_ids else 'Todos os ficheiros estão no link privado; o conjunto excede o limite de anexos do email.'
        EmailDraft.objects.create(conversation=conversation, template_key='artwork', updated_by=actor,
            subject=f'Arte para apreciação — {quote.reference} v{version.version}', attachment_ids=attachment_ids,
            body=f'Olá {quote.client_company or quote.client_name},\n\nArte v{version.version} do pedido {quote.reference} ({len(package)} ficheiro(s)). {delivery}\n\nReveja todos os ficheiros e aprove o conjunto ou indique alterações:\n{link}\n\nA produção aguarda a aprovação da versão atual. Pode responder a este email para esclarecer dúvidas.')
        record_activity(action='reception_updated', quote=quote, actor=actor, is_internal=True,
            comment=f'Studio preparou email com arte v{version.version}; aguarda revisão e envio pela Recepção.')
        for staff in User.objects.filter(is_staff=True, is_active=True).select_related('profile'):
            if has_staff_capability(staff, 'reception.manage'):
                PortalNotification.objects.create(recipient=staff, title=f'{quote.reference}: enviar arte v{version.version} ao cliente', href='/admin/apoio')
    return conversation.pk
