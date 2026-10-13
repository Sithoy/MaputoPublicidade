"""Bounded HTTPS mail transport and opt-in, idempotent inbound import."""
import hashlib
from datetime import UTC, datetime, timedelta
from email.utils import parseaddr
from html import unescape

from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework.exceptions import ValidationError

from .email_connection import cipher
from .models import EmailConnection, SupportConversation, SupportMessage
from .zoho_oauth import decrypt, provider

MAILBOX = 'atendimento@maputopublicidade.com'


def connection():
    return EmailConnection.objects.filter(pk=1).first()


def access(config):
    if not config or not config.oauth_refresh or not config.oauth_account_id.isdigit():
        raise ValidationError('Ligue a conta Atendimento à API Zoho.')
    revision = hashlib.sha256((config.oauth_client_id + config.oauth_secret + config.oauth_refresh).encode()).hexdigest()
    key = 'zoho-mail-access:' + revision
    cached = cache.get(key)
    if cached:
        return decrypt(cached)
    value = provider('POST', 'https://accounts.zoho.com/oauth/v2/token', data={
        'grant_type': 'refresh_token', 'client_id': config.oauth_client_id,
        'client_secret': decrypt(config.oauth_secret), 'refresh_token': decrypt(config.oauth_refresh),
    })
    token = value.get('access_token')
    if not isinstance(token, str) or not token:
        raise ValidationError('Renove a autorização Zoho.')
    cache.set(key, cipher().encrypt(token.encode()).decode(), timeout=3000)
    return token


def headers(config):
    return {'Authorization': 'Zoho-oauthtoken ' + access(config)}


def address(value):
    result = parseaddr(value)[1].strip().lower()
    try:
        validate_email(result)
        if '\n' in value or '\r' in value:
            raise DjangoValidationError('Invalid address')
    except DjangoValidationError:
        raise ValidationError('Endereço de email inválido.') from None
    return result


def send(config, subject, body, to, cc=None, bcc=None, reply_id=None, mail_format='plaintext'):
    if not config or not config.sending_enabled:
        raise ValidationError('O envio por email está desativado nas Definições.')
    if '\n' in subject or '\r' in subject:
        raise ValidationError('Assunto inválido.')
    payload = {'fromAddress': MAILBOX, 'toAddress': ','.join(address(value) for value in to),
               'subject': subject, 'content': body, 'mailFormat': mail_format, 'encoding': 'UTF-8'}
    if not payload['toAddress']:
        raise ValidationError('Indique um destinatário.')
    if cc:
        payload['ccAddress'] = ','.join(address(value) for value in cc)
    if bcc:
        payload['bccAddress'] = ','.join(address(value) for value in bcc)
    url = f'https://mail.zoho.com/api/accounts/{config.oauth_account_id}/messages'
    if reply_id:
        if not str(reply_id).isdigit():
            raise ValidationError('Mensagem de origem inválida.')
        url += '/' + str(reply_id)
        payload['action'] = 'reply'
    # Never retry sending automatically: a timeout may have occurred after acceptance.
    return provider('POST', url, headers=headers(config), json=payload)


def sync_mail():
    with transaction.atomic():
        config = EmailConnection.objects.select_for_update().filter(pk=1).first()
        if not config or not config.receiving_enabled:
            return {'imported': 0, 'active': False, 'more': False}
        now = timezone.now()
        if config.sync_lock_until and config.sync_lock_until > now:
            return {'imported': 0, 'active': True, 'busy': True, 'more': True}
        lease = now + timedelta(minutes=2)
        config.sync_lock_until = lease
        config.save(update_fields=['sync_lock_until'])
    imported = 0
    try:
        auth = headers(config)
        # Five emails per batch bounds execution and content requests. Read/unread untouched.
        result = provider('GET', f'https://mail.zoho.com/api/accounts/{config.oauth_account_id}/messages/view',
                          headers=auth, params={'start': config.sync_start, 'limit': 5, 'sortorder': 'false',
                                              'status': 'all', 'includesent': 'false', 'includearchive': 'false'})
        rows = result.get('data')
        if not isinstance(rows, list):
            raise ValidationError('Resposta de sincronização Zoho inválida.')
        stopped = False
        for row in reversed(rows):
            try:
                received = datetime.fromtimestamp(int(row.get('receivedTime', '0')) / 1000, tz=UTC)
            except (ValueError, TypeError, OverflowError):
                continue
            if not config.receiving_since or received < config.receiving_since:
                stopped = True
                continue
            message_id, folder_id = str(row.get('messageId', '')), str(row.get('folderId', ''))
            if not message_id.isdigit() or not folder_id.isdigit():
                continue
            external_id = config.oauth_account_id + ':' + message_id
            if SupportMessage.objects.filter(email_id=external_id).exists():
                continue
            try:
                sender = address(row.get('fromAddress', ''))
            except ValidationError:
                continue
            if sender == MAILBOX:
                continue
            content = provider('GET', f'https://mail.zoho.com/api/accounts/{config.oauth_account_id}/folders/{folder_id}/messages/{message_id}/content',
                               headers=auth, params={'includeBlockContent': 'true'})
            body = unescape(strip_tags(str(content.get('data', {}).get('content', ''))))[:3900]
            if str(row.get('hasAttachment', '0')) == '1':
                body += '\n\n[Este email contém anexos. Consulte os anexos na caixa Zoho.]'
            subject = strip_tags(str(row.get('subject', 'Sem assunto')))[:160] or 'Sem assunto'
            thread_key = hashlib.sha256((config.oauth_account_id + ':' + str(row.get('threadId') or message_id) + ':' + sender).encode()).hexdigest()
            with transaction.atomic():
                current = EmailConnection.objects.select_for_update().get(pk=1)
                if not current.receiving_enabled or current.oauth_refresh != config.oauth_refresh or current.receiving_since != config.receiving_since:
                    raise ValidationError('A ligação mudou. Atualize novamente.')
                conversation, _ = SupportConversation.objects.get_or_create(email_thread_key=thread_key, defaults={
                    'channel': 'email', 'contact_email': sender, 'contact_name': strip_tags(str(row.get('sender', '')))[:160],
                    'subject': subject,
                })
                message, created = SupportMessage.objects.get_or_create(email_id=external_id, defaults={
                    'conversation': conversation, 'sender': None, 'is_staff': False, 'source': 'email',
                    'body': body or '[Email sem conteúdo textual]', 'delivery_status': 'received',
                })
                if created:
                    SupportMessage.objects.filter(pk=message.pk).update(created_at=received)
                    conversation.status = 'awaiting_team'
                    conversation.last_inbound_at = received
                    conversation.save(update_fields=['status', 'last_inbound_at', 'updated_at'])
                    from .support_views import notify_message
                    notify_message(conversation, None)
                    imported += 1
        more = len(rows) == 5 and not stopped
        with transaction.atomic():
            current = EmailConnection.objects.select_for_update().get(pk=1)
            if current.sync_lock_until == lease:
                current.sync_start = config.sync_start + len(rows) if more else 1
                current.last_synced_at = timezone.now()
                current.save(update_fields=['sync_start', 'last_synced_at'])
        return {'imported': imported, 'active': True, 'more': more, 'last_synced_at': current.last_synced_at}
    finally:
        EmailConnection.objects.filter(pk=1, sync_lock_until=lease).update(sync_lock_until=None)


def send_reply(conversation, sender, body, request_id):
    config = connection()
    if not config or not config.sending_enabled:
        raise ValidationError('O envio por email está desativado.')
    with transaction.atomic():
        conversation = SupportConversation.objects.select_for_update().get(pk=conversation.pk)
        previous = SupportMessage.objects.filter(email_request_id=request_id).first()
        if previous:
            if previous.conversation_id != conversation.pk or previous.sender_id != sender.pk or previous.body != body:
                raise ValidationError('Identificador de envio inválido.')
            if previous.delivery_status == 'accepted':
                return previous
            raise ValidationError('Envio não confirmado. Verifique a caixa Zoho antes de tentar novamente.')
        original = conversation.messages.filter(source='email', is_staff=False, email_id__isnull=False).order_by('-created_at', '-id').first()
        if not original or not original.email_id.startswith(config.oauth_account_id + ':'):
            raise ValidationError('Email original indisponível nesta ligação.')
        message = SupportMessage.objects.create(conversation=conversation, sender=sender, is_staff=True,
                                                source='email', body=body, delivery_status='unconfirmed', email_request_id=request_id)
    send(config, 'Re: ' + conversation.subject, body, [conversation.contact_email], reply_id=original.email_id.split(':')[1])
    message.delivery_status = 'accepted'
    message.save(update_fields=['delivery_status'])
    conversation.status = 'awaiting_client'
    conversation.save(update_fields=['status', 'updated_at'])
    return message
