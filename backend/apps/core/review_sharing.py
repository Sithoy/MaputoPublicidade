"""Shared, deliberately small review messages and auditable renewal requests."""
import re
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.utils import timezone

from apps.accounts.roles import has_staff_capability

from .models import ActivityEvent, PortalNotification


def line(value, limit=120):
    return re.sub(r'\s+', ' ', re.sub(r'[*_~`]', '', str(value or ''))).strip()[:limit]


def share_data(quote, version, link, expires_at, kind):
    from apps.quotes.client_proposal import whatsapp_number

    items = list(quote.items.all())
    work = line(f'{items[0].quantity} × {items[0].description}') if items else 'Trabalho personalizado'
    if len(items) > 1:
        work += f' (+{len(items) - 1} artigos)'
    expiry = expires_at.astimezone(ZoneInfo('Africa/Maputo')).strftime('%d/%m/%Y às %H:%M')
    title = 'Arte para aprovação' if kind == 'artwork' else 'Proposta para apreciação'
    action = 'Reveja todos os ficheiros e aprove a arte ou indique alterações.' if kind == 'artwork' else 'Reveja as condições e aceite, peça alterações ou recuse a proposta.'
    message = (f'Olá {line(quote.client_company or quote.client_name, 80)},\n\n'
               f'*{title} · {quote.reference}*\n*Trabalho:* {work}\n*Versão:* {version}\n\n'
               f'{action}\n{link}\n\n*Link válido até:* {expiry} (Maputo).\n'
               'Se tiver dúvidas, responda a esta mensagem.\n\n_Maputo Publicidade · BrandDesk_')
    return {'link': link, 'expires_at': expires_at, 'message': message,
            'whatsapp_number': whatsapp_number(quote.client_phone), 'expired': False}


def request_review_link(quote, kind, version):
    """Caller holds the quote lock. At most one request per version/kind/day."""
    marker = f'Pedido de novo link: {kind} v{version}. Verificar versão e reenviar ao contacto registado.'
    if not ActivityEvent.objects.filter(quote=quote, action='reception_updated', comment=marker,
                                        created_at__gte=timezone.now() - timedelta(days=1)).exists():
        ActivityEvent.objects.create(action='reception_updated', quote=quote, is_internal=True, comment=marker)
        for staff in User.objects.filter(is_staff=True, is_active=True).select_related('profile'):
            if has_staff_capability(staff, 'reception.manage'):
                PortalNotification.objects.create(recipient=staff,
                    title=f'{quote.reference}: pedido de novo link ({kind} v{version})',
                    href=f'/admin/recepcao?pedido={quote.reference}')
    return {'detail': 'Pedido enviado à Recepção. A equipa verificará a versão atual e contactará o destinatário registado.'}


def validate_artwork_links(body, quote_id):
    from django.http import Http404
    from rest_framework.exceptions import ValidationError

    from .production_views import PublicArtReview
    from .studio import current_proof

    for token in re.findall(r'/arte/rever/([^\s<>"\']+)', body or ''):
        try:
            version = PublicArtReview().version(token.rstrip('.,;)/'))
            if version.quote_id != quote_id or version.client_decision != 'pending' or not current_proof(version.quote, version):
                raise ValueError()
        except (Http404, ValueError):
            raise ValidationError('O link de arte no email expirou ou foi substituído. Prepare o link atual no Studio e reveja o rascunho.') from None
