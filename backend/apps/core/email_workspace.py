import uuid

from django.db import transaction
from django.db.models import Count, Q, Sum
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response

from apps.accounts.roles import has_staff_capability

from .email_templates import KEYS, models_for, preview
from .models import EmailDraft, SupportFile, SupportMessage
from .signatures import staff_signature
from .support_files import metadata, selected_files


class DraftConflict(APIException):
    status_code = 409
    default_detail = 'O rascunho mudou. Reabra o email para carregar a versão atual.'


class DraftInput(serializers.Serializer):
    version = serializers.IntegerField(min_value=0)
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField(max_length=4000, allow_blank=True, trim_whitespace=False)
    template_key = serializers.ChoiceField(choices=['', *KEYS], default='')
    attachment_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), max_length=3, default=list)

    def validate_subject(self, value):
        if '\n' in value or '\r' in value:
            raise serializers.ValidationError('Assunto inválido.')
        return value


def draft_data(draft):
    user = draft.updated_by
    return {'subject': draft.subject, 'body': draft.body, 'template_key': draft.template_key,
            'version': draft.version, 'send_state': draft.send_state, 'updated_at': draft.updated_at, 'attachment_ids': draft.attachment_ids,
            'updated_by': (user.get_full_name() or user.email or user.username) if user else None}


def get_draft(conversation):
    subject = conversation.subject if conversation.subject.lower().startswith('re:') else 'Re: ' + conversation.subject
    return EmailDraft.objects.get_or_create(conversation=conversation, defaults={'subject': subject[:255]})[0]


class EmailWorkspaceMixin:
    def email_conversation(self):
        conversation = self.get_object()
        if not self.request.user.is_staff or conversation.channel != 'email':
            raise PermissionDenied()
        return conversation

    @action(detail=False, methods=['get'], url_path='inbox-summary')
    def inbox_summary(self, request):
        if not request.user.is_staff:
            raise PermissionDenied()
        stages = ['new', 'preparing', 'waiting', 'resolved']
        totals = self.get_queryset().aggregate(
            email=Count('pk', filter=Q(channel='email')),
            email_unread=Sum('unread_count', filter=Q(channel='email')),
            conversations=Count('pk', filter=~Q(channel='email')),
            conversation_unread=Sum('unread_count', filter=~Q(channel='email')),
            **{f'stage_{stage}': Count('pk', filter=Q(channel='email', email_stage=stage)) for stage in stages},
        )
        return Response({key: totals[key] or 0 for key in ['email', 'email_unread', 'conversations', 'conversation_unread']} |
                        {'stages': {stage: totals[f'stage_{stage}'] for stage in stages}})

    @action(detail=True, methods=['get', 'patch'], url_path='email-draft')
    def email_draft(self, request, pk=None):
        conversation = self.email_conversation()
        if request.method == 'GET':
            return Response(draft_data(get_draft(conversation)))
        values = DraftInput(data=request.data)
        values.is_valid(raise_exception=True)
        with transaction.atomic():
            get_draft(conversation)
            draft = EmailDraft.objects.select_for_update().get(conversation=conversation)
            if draft.version != values.validated_data['version']:
                raise DraftConflict()
            if draft.send_state != 'idle':
                raise DraftConflict('Envio em curso ou não confirmado. Verifique no Zoho antes de alterar o rascunho.')
            selected_files(conversation, values.validated_data['attachment_ids'])
            for field in ['subject', 'body', 'template_key', 'attachment_ids']:
                setattr(draft, field, values.validated_data[field])
            draft.version += 1
            draft.request_id = uuid.uuid4()
            draft.updated_by = request.user
            draft.save()
            if draft.body.strip():
                conversation.email_stage = 'preparing'
                conversation.status = 'awaiting_team'
                conversation.save(update_fields=['email_stage', 'status', 'updated_at'])
        return Response(draft_data(draft))

    @action(detail=True, methods=['get'], url_path='email-models')
    def email_models(self, request, pk=None):
        return Response({'models': models_for(self.email_conversation(), request.user)})

    @action(detail=True, methods=['post'], url_path='email-preview')
    def email_preview(self, request, pk=None):
        draft = get_draft(self.email_conversation())
        if request.data.get('version') != draft.version:
            raise DraftConflict()
        files = selected_files(draft.conversation, draft.attachment_ids)
        return Response(preview(draft.subject, draft.body, staff_signature(request.user), [metadata(row) for row in files]))

    @action(detail=True, methods=['post'], url_path='email-send')
    def email_send(self, request, pk=None):
        conversation = self.email_conversation()
        with transaction.atomic():
            get_draft(conversation)
            draft = EmailDraft.objects.select_for_update().get(conversation=conversation)
            if request.data.get('version') != draft.version or draft.send_state != 'idle':
                raise DraftConflict('Rascunho alterado ou envio em curso. Reabra o email antes de continuar.')
            files = selected_files(conversation, draft.attachment_ids)
            from apps.quotes.client_proposal import validate_proposal_email
            validate_proposal_email(conversation, files, draft.body)
            from .review_sharing import validate_artwork_links
            validate_artwork_links(draft.body, conversation.quote_id)
            rendered = preview(draft.subject, draft.body, staff_signature(request.user, required=True), [metadata(row) for row in files])
            if not draft.body.strip() or rendered['missing']:
                raise serializers.ValidationError('Complete o texto e todos os campos assinalados antes de enviar.')
            if request.data.get('confirmed') is not True or request.data.get('preview_hash') != rendered['hash']:
                raise serializers.ValidationError('Pré-visualize a versão atual e confirme os destinatários e o conteúdo.')
            prepared_by = draft.updated_by_id
            draft.send_state = 'sending'
            draft.updated_by = request.user
            draft.save()
        from .zoho_mail import send_reply
        try:
            message = send_reply(conversation, request.user, draft.body, draft.request_id,
                                 subject=draft.subject, rendered_body=rendered['html'], signature=rendered['signature'], prepared_by=prepared_by, files=files)
        except Exception:
            EmailDraft.objects.filter(pk=draft.pk, request_id=draft.request_id).update(send_state='unconfirmed')
            raise serializers.ValidationError('Envio não confirmado. O rascunho foi preservado. Verifique a caixa Zoho antes de reenviar.') from None
        with transaction.atomic():
            current = EmailDraft.objects.select_for_update().get(pk=draft.pk)
            if current.request_id == draft.request_id:
                current.body = ''
                current.template_key = ''
                current.attachment_ids = []
                current.version += 1
                current.request_id = uuid.uuid4()
                current.send_state = 'idle'
                current.save()
        return Response({'detail': 'Email aceite pelo Zoho para envio.', 'draft': draft_data(current), 'message_id': message.pk})

    @action(detail=True, methods=['post'], url_path='email-recover')
    def email_recover(self, request, pk=None):
        conversation = self.email_conversation()
        if request.data.get('confirmed') is not True or request.data.get('outcome') not in ['sent', 'not_sent']:
            raise serializers.ValidationError('Confirme primeiro a verificação manual na caixa Zoho.')
        with transaction.atomic():
            get_draft(conversation)
            draft = EmailDraft.objects.select_for_update().get(conversation=conversation)
            from datetime import timedelta

            from django.utils import timezone
            if draft.version != request.data.get('version') or draft.send_state == 'idle':
                raise DraftConflict()
            if draft.send_state == 'sending' and draft.updated_at > timezone.now() - timedelta(minutes=2):
                raise DraftConflict('O envio ainda está em curso. Aguarde antes de verificar.')
            message = SupportMessage.objects.filter(email_request_id=draft.request_id, conversation=conversation).first()
            if request.data['outcome'] == 'sent' and not message:
                raise serializers.ValidationError('Não existe um registo deste envio para confirmar.')
            if message:
                message.delivery_status = 'accepted' if request.data['outcome'] == 'sent' else 'failed'
                message.email_headers = {**message.email_headers, 'verified_by': request.user.pk, 'verified_at': timezone.now().isoformat()}
                message.save(update_fields=['delivery_status', 'email_headers'])
            if request.data['outcome'] == 'sent':
                draft.body = ''
                draft.attachment_ids = []
                conversation.email_stage = 'waiting'
                conversation.status = 'awaiting_client'
                conversation.save(update_fields=['email_stage', 'status', 'updated_at'])
            elif message and draft.attachment_ids:
                # Preserve immutable evidence of the failed attempt; retry uses new files/nonce.
                retry_ids = []
                for original in SupportFile.objects.filter(pk__in=draft.attachment_ids, message=message):
                    original.pk = None
                    original.message = None
                    original.uploaded_by = request.user
                    original.save()
                    retry_ids.append(original.pk)
                draft.attachment_ids = retry_ids
            draft.request_id = uuid.uuid4()
            draft.send_state = 'idle'
            draft.version += 1
            draft.updated_by = request.user
            draft.save()
        return Response(draft_data(draft))

    @action(detail=True, methods=['patch'], url_path='email-stage')
    def email_stage(self, request, pk=None):
        conversation = self.email_conversation()
        stage = serializers.ChoiceField(choices=['new', 'preparing', 'waiting', 'resolved']).run_validation(request.data.get('stage'))
        conversation.email_stage = stage
        conversation.status = 'resolved' if stage == 'resolved' else 'awaiting_client' if stage == 'waiting' else 'awaiting_team'
        conversation.save(update_fields=['email_stage', 'status', 'updated_at'])
        return Response(self.get_serializer(conversation).data)

    @action(detail=True, methods=['patch'], url_path='email-context')
    def email_context(self, request, pk=None):
        conversation = self.email_conversation()
        from .support_views import CONTEXT_CAPABILITIES, CONTEXT_MODELS
        kind = serializers.ChoiceField(choices=list(CONTEXT_MODELS)).run_validation(request.data.get('kind'))
        reference = serializers.CharField(max_length=30, allow_blank=True).run_validation(request.data.get('reference'))
        if not has_staff_capability(request.user, CONTEXT_CAPABILITIES[kind]):
            raise PermissionDenied()
        target = CONTEXT_MODELS[kind].objects.filter(reference=reference).first() if reference else None
        if reference and not target:
            raise serializers.ValidationError('Referência indisponível.')
        for field in CONTEXT_MODELS:
            setattr(conversation, field, target if field == kind else None)
        conversation.save(update_fields=[*CONTEXT_MODELS, 'updated_at'])
        return Response(self.get_serializer(conversation).data)
