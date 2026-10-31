"""Version-scoped decisions; acceptance atomically authorises a production order."""
import hashlib
import json
import re
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from django.utils.http import base36_to_int, int_to_base36
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.core.activity import record_activity
from apps.core.documents import build_quote_pdf

from .models import QuoteRequest
from .proposal_workflow import document_snapshot

SALT = 'mp-commercial-review-v1'
MAX_AGE = 60 * 24 * 3600
LEGACY_MAX_AGE = 7 * 24 * 3600
COMPACT_SALT = 'mp-commercial-review-compact-v1'


def fingerprint(quote):
    # Hash persisted values consistently (e.g. Decimal('232') vs database
    # Decimal('232.00')); unsaved Python representations are not a revision.
    quote = QuoteRequest.objects.get(pk=quote.pk)
    snapshot = document_snapshot(quote)
    snapshot['sent_at'] = str(quote.proposal_sent_at)
    snapshot['details'] = list(quote.items.values('size', 'material', 'colors', 'material_briefing', 'position'))
    return salted_hmac(SALT, json.dumps(snapshot, sort_keys=True, default=str)).hexdigest()


def decision(quote):
    for row in reversed(quote.proposal_history):
        if row.get('version') == quote.proposal_version and row.get('client_decision'):
            return {key: row.get(key) for key in ['client_decision', 'at', 'contact_name', 'channel', 'comment', 'actor']}
    if quote.price_approved_at:
        return {'client_decision': 'accept', 'at': quote.price_approved_at, 'channel': 'branddesk', 'comment': quote.price_approval_comment}
    return None


def require_published(quote):
    if quote.proposal_stage not in {'sent', 'returned'} or not quote.proposal_sent_at or not quote.proposal_version:
        raise ValidationError('Disponibilize a versão atual ao cliente antes de partilhar o link.')


def review_link(quote):
    require_published(quote)
    # Standard Django SHA-256 signing; the document fingerprint is part of the
    # signing namespace rather than repeated as a long JSON field in the URL.
    payload = '.'.join(int_to_base36(value) for value in (quote.pk, quote.proposal_version, int(time.time())))
    token = 'p1.' + signing.Signer(salt=f'{COMPACT_SALT}:{fingerprint(quote)}', algorithm='sha256').sign(payload)
    origin = getattr(settings, 'TRACKING_SITE_URL', 'https://maputopublicidade.com').rstrip('/')
    return f'{origin}/proposta#token={token}'


def compact_review_quote(token, allow_expired=False):
    match = re.fullmatch(r'p1\.([0-9a-z]{1,10})\.([0-9a-z]{1,7})\.([0-9a-z]{1,8}):[A-Za-z0-9_-]{43}', token)
    if not match:
        raise ValueError()
    quote = QuoteRequest.objects.select_for_update().get(pk=base36_to_int(match[1]))
    signing.Signer(salt=f'{COMPACT_SALT}:{fingerprint(quote)}', algorithm='sha256').unsign(token[3:])
    ttl = quote.validity_days * 24 * 3600 if quote.validity_days else LEGACY_MAX_AGE
    age = time.time() - base36_to_int(match[3])
    if base36_to_int(match[2]) != quote.proposal_version or not 0 <= age <= (90 * 86400 if allow_expired else min(ttl, MAX_AGE)):
        raise ValueError()
    return quote


def resolve_review_quote(token, allow_expired=False):
    if len(token) > 1024:
        raise ValueError()
    if token.startswith('p1.'):
        quote = compact_review_quote(token, allow_expired)
    else:
        payload = signing.loads(token, salt=SALT, max_age=90 * 86400 if allow_expired else MAX_AGE)
        ttl = payload.get('ttl', LEGACY_MAX_AGE)
        if type(ttl) is not int or ttl not in {days * 86400 for days in (7, 15, 30, 60)}:
            raise ValueError()
        if not allow_expired:
            signing.loads(token, salt=SALT, max_age=ttl)
        quote = QuoteRequest.objects.select_for_update().get(pk=payload['q'])
        if payload['v'] != quote.proposal_version or not constant_time_compare(payload['f'], fingerprint(quote)):
            raise ValueError()
    require_published(quote)
    if quote.status == 'cancelled':
        raise ValueError()
    return quote


def prepare_share(quote):
    from apps.core.review_sharing import share_data

    require_published(quote)
    if quote.status == 'cancelled' or decision(quote):
        raise ValidationError('Esta proposta já não aguarda uma decisão. Atualize o pedido.')
    if quote.valid_until and quote.valid_until < timezone.localdate():
        raise ValidationError('A proposta expirou. Reveja as condições antes de partilhar um novo link.')
    expires = timezone.now() + timedelta(seconds=min(quote.validity_days * 86400 if quote.validity_days else LEGACY_MAX_AGE, MAX_AGE))
    if quote.valid_until:
        midnight = datetime.combine(quote.valid_until + timedelta(days=1), datetime.min.time(), tzinfo=ZoneInfo('Africa/Maputo'))
        expires = min(expires, midnight)
    return share_data(quote, quote.proposal_version, review_link(quote), expires, 'proposal')


def publish_notice(quote):
    from apps.core.models import PortalNotification

    if quote.user_id and not quote.user.is_staff:
        PortalNotification.objects.get_or_create(recipient=quote.user,
            title=f'{quote.reference}: proposta v{quote.proposal_version} disponível',
            href=f'/area-cliente/orcamentos/{quote.reference}')


def review_data(quote):
    recorded = decision(quote)
    # Phone-call context and legacy approval comments can contain internal
    # staff notes. A link holder only needs the decision and its provenance.
    public_decision = {key: recorded[key] for key in ['client_decision', 'at', 'contact_name', 'channel'] if key in recorded} if recorded else None
    return {
        'reference': quote.reference, 'version': quote.proposal_version,
        'client_name': quote.client_company or quote.client_name,
        'valid_until': quote.valid_until, 'total': quote.final_price,
        'subtotal': quote.subtotal, 'discount': quote.discount_amount,
        'tax_rate': quote.tax_rate, 'tax_amount': quote.tax_amount, 'vat_exempt': quote.vat_exempt,
        'delivery_days': quote.estimated_delivery_days, 'payment': quote.get_payment_option_display(),
        'terms': quote.terms, 'notes': quote.notes, 'decision': public_decision,
        'expired': bool(quote.valid_until and quote.valid_until < timezone.localdate()),
        'items': [{'description': item.description, 'quantity': item.quantity,
                   'unit_price': item.unit_price, 'notes': item.notes,
                   'specifications': ' · '.join(filter(None, [item.size, item.material, item.colors])),
                   'configuration': (item.material_briefing or {}).get('catalogue_configuration', {}),
                   'apparel': (item.material_briefing or {}).get('apparel')}
                  for item in quote.items.all()],
    }


class DecisionInput(serializers.Serializer):
    action = serializers.ChoiceField(choices=['accept', 'changes', 'decline'])
    version = serializers.IntegerField(min_value=1)
    contact_name = serializers.CharField(max_length=160)
    comment = serializers.CharField(max_length=3000, allow_blank=True, default='')
    confirmed = serializers.BooleanField()


@transaction.atomic
def record_decision(quote, values, *, actor=None, channel='link'):
    # All channels serialize on the same row; the one-to-one Order.quote is a
    # second database-level safeguard against duplicate hand-offs.
    QuoteRequest.objects.select_for_update().get(pk=quote.pk)
    quote.refresh_from_db()
    require_published(quote)
    if values['version'] != quote.proposal_version or decision(quote) or hasattr(quote, 'order') or quote.status == 'cancelled':
        raise ValidationError('Esta versão já tem uma decisão ou foi alterada. Atualize a página.')
    if quote.valid_until and quote.valid_until < timezone.localdate():
        raise ValidationError('A proposta expirou. Peça à Recepção uma versão atualizada.')
    if not values['confirmed']:
        raise ValidationError('Confirme explicitamente a sua decisão.')
    if values['action'] != 'accept' and not values['comment'].strip():
        raise ValidationError('Indique o motivo ou as alterações pretendidas.')
    now = timezone.now()
    action = values['action']
    quote.proposal_history = [*quote.proposal_history, {
        'action': {'accept': 'Proposta aceite', 'changes': 'Alterações pedidas', 'decline': 'Proposta recusada'}[action],
        'version': quote.proposal_version, 'at': now.isoformat(),
        'actor_id': actor.pk if actor else None,
        'actor': (actor.get_full_name() or actor.username) if actor else 'Cliente por link privado',
        'contact_name': values['contact_name'], 'channel': channel,
        'client_decision': action, 'comment': values['comment'],
    }]
    if action == 'accept':
        quote.status = 'approved'
        quote.price_approved_at = now
        quote.price_approved_by = actor
        quote.price_approval_comment = f"{values['contact_name']} ({channel}): {values['comment']}"
    else:
        quote.status = 'reviewing'
        quote.proposal_stage = 'returned'
    quote.save()
    record_activity(action='price_approved' if action == 'accept' else 'status_changed',
                    quote=quote, actor=actor, is_internal=True,
                    comment=f"Decisão da proposta v{quote.proposal_version}: {action}. Contacto: {values['contact_name']}. Canal: {channel}. {values['comment']}")
    if action == 'accept':
        authorise_operation(quote, actor=actor)


def authorise_operation(quote, *, actor=None):
    """Caller holds the quote lock. Approval queues work, not manufacture or payment."""
    from apps.core.models import ActivityEvent, PortalNotification
    from apps.orders.from_quote import create_order_from_quote
    from apps.orders.models import Order

    if not quote.price_approved_at:
        raise ValidationError('Registe a aceitação do cliente antes de autorizar a operação.')
    existing = Order.objects.filter(quote=quote).first()
    if existing:
        return existing
    from apps.core.reception_briefing import reception_briefing
    briefing = reception_briefing(quote)
    fulfilment = briefing.get('fulfilment')
    order = create_order_from_quote(quote,
        delivery_method=Order.DELIVERY_DELIVERY if fulfilment in {'delivery', 'installation'} else Order.DELIVERY_PICKUP,
        delivery_address=briefing.get('delivery_address') or '')
    order.installation_required = fulfilment == 'installation'
    order.save(update_fields=['installation_required'])
    record_activity(action=ActivityEvent.ACTION_CONVERTED_TO_ORDER, quote=quote, actor=actor,
        comment=f'Aceitação da proposta v{quote.proposal_version}: operação autorizada. Encomenda {order.reference}.')
    record_activity(action=ActivityEvent.ACTION_CREATED, order=order, actor=actor,
        comment=f'Operação autorizada pela aceitação da proposta {quote.reference} v{quote.proposal_version}.')
    if quote.user_id and not quote.user.is_staff:
        PortalNotification.objects.get_or_create(recipient=quote.user,
            title=f'{quote.reference}: proposta aceite; operação autorizada',
            href=f'/area-cliente/encomendas/{order.reference}')
    from django.contrib.auth.models import User

    from apps.accounts.roles import has_staff_capability
    from apps.core.studio import readiness
    needs_art = readiness(quote)['needs_art']
    for staff in User.objects.filter(is_staff=True, is_active=True).select_related('profile'):
        if has_staff_capability(staff, 'reception.manage'):
            PortalNotification.objects.get_or_create(recipient=staff,
                title=f'{quote.reference}: cliente aprovou; encomenda criada',
                href=f'/admin/recepcao?pedido={quote.reference}')
        if has_staff_capability(staff, 'production.view'):
            PortalNotification.objects.get_or_create(recipient=staff,
                title=f'{quote.reference}: novo trabalho autorizado' + (' · Studio necessário' if needs_art else ' · pronto para produção'),
                href='/admin/studio' if needs_art else '/admin/producao')
    from apps.core.notifications import notify_order_created
    transaction.on_commit(lambda: notify_order_created(order), robust=True)
    return order


def prepare_email(quote, user):
    from apps.accounts.roles import has_staff_capability
    from apps.core.models import EmailDraft, SupportConversation, SupportFile
    from apps.core.support_files import validate_file

    if not has_staff_capability(user, 'support.manage') or not has_staff_capability(user, 'quotes.export'):
        raise PermissionDenied()
    if not quote.client_email:
        raise ValidationError('Confirme o email do cliente no pedido.')
    prepare_share(quote)
    key = email_key(quote)
    conversation, _ = SupportConversation.objects.get_or_create(email_thread_key=key, defaults={
        'channel': 'email', 'client': quote.user, 'quote': quote, 'contact_email': quote.client_email,
        'contact_name': quote.client_name[:160], 'subject': f'Proposta {quote.reference}',
    })
    draft = EmailDraft.objects.select_for_update().filter(conversation=conversation).first()
    if draft:
        return conversation.pk  # Never overwrite a colleague's draft or repeat a sent email.
    content = build_quote_pdf(quote)
    name, mime = validate_file(f'Proposta-{quote.reference}-v{quote.proposal_version}.pdf', content)
    file = SupportFile.objects.create(conversation=conversation, uploaded_by=user, name=name, mime_type=mime,
        size=len(content), sha256=hashlib.sha256(content).hexdigest(), content=content,
        document_source={'kind': 'proposal', 'quote_id': quote.pk, 'version': quote.proposal_version, 'fingerprint': fingerprint(quote)})
    body = (f'Olá {quote.client_company or quote.client_name},\n\n'
        f'Partilhamos em anexo a proposta {quote.reference}, versão {quote.proposal_version}.\n\n'
        f'Reveja os artigos e condições, aceite, peça alterações ou recuse através do link privado:\n{review_link(quote)}\n\n'
        f'Validade: {quote.valid_until or "conforme proposta"}.\nPagamento: {quote.get_payment_option_display()}.\n\n'
        'Pode responder diretamente a este email. Ao aceitar a proposta autoriza a operação. '
        'A aceitação não confirma o pagamento; a execução respeita as aprovações técnicas necessárias.')
    EmailDraft.objects.create(conversation=conversation, subject=f'Proposta comercial - {quote.reference}',
        body=body, template_key='proposal', attachment_ids=[file.pk], updated_by=user)
    record_activity(action='reception_updated', quote=quote, actor=user, is_internal=True,
                    comment=f'Email da proposta v{quote.proposal_version} preparado com PDF; envio ainda não efetuado.')
    return conversation.pk


def email_key(quote):
    return hashlib.sha256(f'proposal:{quote.pk}:{quote.proposal_version}:{fingerprint(quote)}'.encode()).hexdigest()


def validate_proposal_email(conversation, files, body=None):
    """Bind outgoing proposal attachments to the published commercial version."""
    proposals = [file for file in files if file.document_source.get('kind') == 'proposal']
    if not proposals:
        return False
    quote = QuoteRequest.objects.filter(pk=conversation.quote_id).first()
    if not quote:
        raise ValidationError('A proposta deste anexo já não está disponível.')
    require_published(quote)
    if conversation.email_thread_key != email_key(quote):
        raise ValidationError('A proposta mudou. Prepare o email da versão atual na etapa Cliente.')
    if quote.valid_until and quote.valid_until < timezone.localdate():
        raise ValidationError('A proposta expirou. Atualize as condições antes de enviar.')
    for file in proposals:
        source = file.document_source
        if source.get('quote_id') != quote.pk or source.get('version') != quote.proposal_version or (
            source.get('fingerprint') and source['fingerprint'] != fingerprint(quote)
        ):
            raise ValidationError('O PDF pertence a uma versão anterior. Prepare novamente o email.')
    if body:
        for token in re.findall(r'/proposta#token=([^\s<>"\']+)', body):
            try:
                linked = resolve_review_quote(token.rstrip('.,;)'))
                if linked.pk != quote.pk:
                    raise ValueError()
            except (signing.BadSignature, QuoteRequest.DoesNotExist, KeyError, TypeError, ValueError, ValidationError):
                raise ValidationError('O link no email expirou ou mudou. Copie um link atual na etapa Cliente e reveja o rascunho antes de enviar.') from None
    return True


def whatsapp_number(phone):
    if not re.fullmatch(r'\+?[\d\s()-]+', phone or ''):
        return ''
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 9 and digits[:2] in {'82', '83', '84', '85', '86', '87'}:
        digits = '258' + digits
    return digits if 10 <= len(digits) <= 15 and not digits.startswith('0') else ''


def workspace_data(quote):
    from apps.core.models import EmailDraft, SupportConversation, SupportMessage

    published = quote.proposal_stage in {'sent', 'returned'} and bool(quote.proposal_sent_at)
    registered = bool(quote.user_id and quote.user.is_active and not quote.user.is_staff)
    current_decision = decision(quote)
    history = quote.proposal_history or []
    current = [row for row in history if row.get('version') == quote.proposal_version]
    outbound = next((row for row in reversed(current) if row.get('channel') == 'whatsapp' and row.get('delivery') == 'confirmed'), None)
    thread = SupportConversation.objects.filter(email_thread_key=email_key(quote)).first() if published else None
    draft = EmailDraft.objects.filter(conversation=thread).first() if thread else None
    message = SupportMessage.objects.filter(conversation=thread, source='email', is_staff=True).select_related('sender').first() if thread else None
    email_state = 'not_prepared'
    if draft and draft.send_state != 'idle':
        email_state = 'unconfirmed'
    elif message:
        email_state = message.delivery_status or 'unconfirmed'
    elif draft and draft.body.strip():
        email_state = 'draft'
    expired = bool(quote.valid_until and quote.valid_until < timezone.localdate())
    state = ('accepted' if current_decision['client_decision'] == 'accept' else current_decision['client_decision']) if current_decision else (
        'expired' if expired else 'draft' if not published else 'awaiting_response' if registered or outbound or email_state == 'accepted' else 'not_sent')
    return {
        'reference': quote.reference, 'version': quote.proposal_version, 'published': published,
        'registered': registered, 'email': quote.client_email, 'phone': quote.client_phone,
        'whatsapp_number': whatsapp_number(quote.client_phone),
        'link': review_link(quote) if published else None, 'decision': current_decision, 'state': state,
        'published_at': quote.proposal_sent_at, 'expired': expired,
        'order_reference': getattr(getattr(quote, 'order', None), 'reference', None),
        'follow_up': {'date': quote.reception_follow_up_date, 'note': quote.reception_follow_up_note},
        'channels': {
            'branddesk': {'state': 'available' if registered and published else 'not_available'},
            'email': {'state': email_state, 'conversation_id': thread.pk if thread else None,
                      'at': message.created_at if message else draft.updated_at if draft else None,
                      'actor': (message.sender.get_full_name() or message.sender.username) if message and message.sender else None},
            'whatsapp': {'state': 'confirmed' if outbound else 'not_sent', 'at': outbound.get('at') if outbound else None,
                         'actor': outbound.get('actor') if outbound else None},
        },
        'history': [{key: row.get(key) for key in ['action', 'version', 'at', 'actor', 'channel', 'client_decision', 'comment']} for row in history[-12:]],
    }


class ReviewThrottle(AnonRateThrottle):
    scope = 'proposal_review'
    rate = '30/min'


class PublicProposalReview(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ReviewThrottle]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'private, no-store'
        response['Referrer-Policy'] = 'no-referrer'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    @transaction.atomic
    def post(self, request):
        token = request.headers.get('X-MP-Proposal-Token', '')
        command = request.data.get('action', 'view')
        try:
            quote = resolve_review_quote(token, allow_expired=command == 'request_link')
        except (signing.BadSignature, QuoteRequest.DoesNotExist, KeyError, TypeError, ValueError, ValidationError):
            if command != 'request_link':
                try:
                    expired_quote = resolve_review_quote(token, allow_expired=True)
                    if not decision(expired_quote):
                        return Response({'detail': 'Este link expirou. Peça um novo link à Recepção.', 'code': 'link_expired'}, status=410)
                except (signing.BadSignature, QuoteRequest.DoesNotExist, KeyError, TypeError, ValueError, ValidationError):
                    pass
            raise PermissionDenied('Link inválido, expirado ou substituído. Contacte a Recepção.') from None
        if command == 'request_link':
            from apps.core.review_sharing import request_review_link
            if decision(quote):
                raise ValidationError('Esta versão já recebeu uma decisão. Contacte a Recepção.')
            return Response(request_review_link(quote, 'proposta', quote.proposal_version))
        if command == 'question':
            from apps.core.models import SupportConversation, SupportMessage
            from apps.core.support_views import notify_message

            body = serializers.CharField(max_length=4000).run_validation(request.data.get('body'))
            # Reuse guest tracking: reception replies already email the client
            # a private continuation link, rather than disappearing in a chat
            # which a guest cannot reopen from their account.
            conversation = SupportConversation.objects.filter(quote=quote, channel='tracking').first()
            if not conversation:
                conversation = SupportConversation.objects.create(quote=quote, client=quote.user,
                    contact_email=quote.client_email, contact_name=quote.client_name[:160],
                    subject=f'Proposta {quote.reference}', channel='tracking')
            SupportMessage.objects.create(conversation=conversation, sender=None, is_staff=False,
                source='proposal', body=f'Proposta v{quote.proposal_version} (link privado):\n{body}')
            conversation.status = 'awaiting_team'
            conversation.updated_at = timezone.now()
            conversation.last_inbound_at = timezone.now()
            conversation.save(update_fields=['status', 'updated_at', 'last_inbound_at'])
            notify_message(conversation, None)
            return Response({'detail': 'Pergunta enviada à Recepção com esta proposta associada.'})
        if command == 'pdf':
            response = HttpResponse(build_quote_pdf(quote), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Proposta-{quote.reference}.pdf"'
            return response
        if command != 'view':
            data = DecisionInput(data=request.data)
            data.is_valid(raise_exception=True)
            record_decision(quote, data.validated_data)
        return Response(review_data(quote))
