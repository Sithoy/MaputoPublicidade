from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.invoices.models import Invoice
from apps.orders.models import Order
from apps.quotes.models import QuoteRequest

from .models import PortalNotification, SupportConversation, SupportMessage


class SupportWriteThrottle(UserRateThrottle):
    scope = "support_write"
    rate = "30/min"

    def allow_request(self, request, view):
        return request.method in {"GET", "HEAD", "OPTIONS"} or super().allow_request(request, view)


class MessageInput(serializers.Serializer):
    body = serializers.CharField(max_length=4000)
    request_id = serializers.UUIDField(required=False)


class WhatsAppReadThrottle(UserRateThrottle):
    scope = "whatsapp_read"
    rate = "30/min"


class TemplateInput(serializers.Serializer):
    revision = serializers.RegexField(r"^[a-f0-9]{64}$")
    template_id = serializers.RegexField(r"^[0-9]{1,30}$")
    name = serializers.RegexField(r"^[a-z0-9_]{1,512}$")
    language = serializers.RegexField(r"^[a-z]{2,3}(?:_[A-Z]{2})?$")
    parameters = serializers.DictField(child=serializers.CharField(max_length=600), default=dict)
    consent_note = serializers.CharField(max_length=500)
    confirmed = serializers.BooleanField()

    def validate_parameters(self, value):
        if len(value) > 40:
            raise serializers.ValidationError("Máximo de 40 variáveis.")
        return value

    def validate_confirmed(self, value):
        if not value:
            raise serializers.ValidationError("Confirme a autorização do cliente e o envio.")
        return value


class ConversationInput(MessageInput):
    subject = serializers.CharField(max_length=160)
    quote_reference = serializers.CharField(max_length=30, required=False, allow_blank=True)
    order_reference = serializers.CharField(max_length=30, required=False, allow_blank=True)
    invoice_reference = serializers.CharField(max_length=30, required=False, allow_blank=True)


CONTEXT_MODELS = {"quote": QuoteRequest, "order": Order, "invoice": Invoice}
CONTEXT_CAPABILITIES = {
    "quote": StaffCapability.VIEW_QUOTES,
    "order": StaffCapability.VIEW_ORDERS,
    "invoice": StaffCapability.VIEW_INVOICES,
}


def context_data(kind, target, user):
    if user.is_staff:
        allowed = has_staff_capability(user, CONTEXT_CAPABILITIES[kind])
    else:
        allowed = target.user_id == user.pk and not (
            kind == "invoice" and target.status == Invoice.STATUS_DRAFT
        )
    if not allowed:
        return {"kind": kind, "available": False}
    title = ""
    if kind == "quote":
        title = target.briefing.get("project_name", "") if isinstance(target.briefing, dict) else ""
    elif kind == "order" and target.quote:
        briefing = target.quote.briefing
        title = briefing.get("project_name", "") if isinstance(briefing, dict) else ""
    elif kind == "invoice":
        title = target.client_company or target.client_name
    return {
        "kind": kind,
        "reference": target.reference,
        "title": title,
        "status": target.get_status_display(),
        "available": True,
    }


class MessageSerializer(serializers.ModelSerializer):
    attachment = serializers.SerializerMethodField()
    template = serializers.SerializerMethodField()

    def get_attachment(self, obj):
        from .whatsapp_media import PREVIEW_TYPES
        data = obj.attachment
        return {"name": data.get("name", "Anexo"), "mime_type": data.get("mime_type", ""),
                "previewable": data.get("mime_type") in PREVIEW_TYPES} if data else None

    def get_template(self, obj):
        return {key: obj.template.get(key) for key in ("name", "language")} if obj.template else None

    class Meta:
        model = SupportMessage
        fields = ["id", "body", "is_staff", "created_at", "source", "delivery_status", "attachment", "template"]


class ConversationSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    whatsapp = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    quote_reference = serializers.SerializerMethodField()
    order_reference = serializers.SerializerMethodField()
    context = serializers.SerializerMethodField()

    def visible_reference(self, obj, kind):
        target = getattr(obj, kind)
        if target and context_data(kind, target, self.context["request"].user)["available"]:
            return target.reference
        return ""

    def get_quote_reference(self, obj):
        return self.visible_reference(obj, "quote")

    def get_order_reference(self, obj):
        return self.visible_reference(obj, "order")

    def get_context(self, obj):
        for kind in CONTEXT_MODELS:
            target = getattr(obj, kind)
            if target:
                return context_data(kind, target, self.context["request"].user)
        return None

    unread_count = serializers.IntegerField(read_only=True)

    def get_client_name(self, obj):
        if obj.channel == "email":
            return obj.contact_name or obj.contact_email or 'Contacto por email'
        if obj.channel == "tracking":
            return obj.contact_name or "Cliente MP"
        if obj.channel == "whatsapp":
            return obj.contact_name or f"+{obj.whatsapp_phone}"
        profile = getattr(obj.client, "profile", None)
        return getattr(profile, "company", "") or obj.client.get_full_name() or "Cliente MP"

    def get_whatsapp(self, obj):
        if obj.channel != "whatsapp":
            return None
        from .whatsapp import can_reply, connection

        if "whatsapp_connection" not in self.context:
            self.context["whatsapp_connection"] = connection()
        config = self.context["whatsapp_connection"]
        return {"phone": obj.whatsapp_phone, "can_reply": can_reply(obj, config),
                "last_inbound_at": obj.last_inbound_at,
                "coexistence": config.details.get("mode", "coexistence") == "coexistence"}

    def get_email(self, obj):
        if obj.channel != 'email' or not self.context['request'].user.is_staff:
            return None
        from .zoho_mail import connection
        config = connection()
        return {'address': obj.contact_email, 'can_reply': bool(config and config.sending_enabled)}

    class Meta:
        model = SupportConversation
        fields = [
            "id",
            "subject",
            "client_name",
            "quote_reference",
            "order_reference",
            "context",
            "status",
            "unread_count",
            "updated_at",
            "channel",
            "whatsapp",
            "email",
        ]


def notify_message(conversation, sender):
    if sender and sender.is_staff:
        if conversation.channel == "tracking" and conversation.quote:
            from .tracking_views import email_tracking_link

            email_tracking_link(conversation.quote)
        recipients = [conversation.client]
        href = f"/area-cliente/apoio?conversa={conversation.pk}"
    else:
        recipients = [
            u
            for u in User.objects.filter(is_active=True, is_staff=True).select_related("profile")
            if has_staff_capability(u, StaffCapability.MANAGE_SUPPORT)
        ]
        href = f"/admin/apoio?conversa={conversation.pk}"
    PortalNotification.objects.bulk_create(
        [
            PortalNotification(
                recipient=u, title=f"Nova mensagem: {conversation.subject}"[:255], href=href
            )
            for u in recipients
            if u and u.pk != getattr(sender, "pk", None)
        ]
    )


class SupportConversationViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SupportWriteThrottle]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = SupportConversation.objects.select_related(
            "client__profile", "quote", "order__quote", "invoice"
        ).annotate(
            unread_count=Count(
                "messages",
                filter=Q(
                    messages__is_staff=not user.is_staff,
                    messages__id__gt=F("staff_read_id" if user.is_staff else "client_read_id"),
                ),
            )
        )
        if user.is_staff:
            if not has_staff_capability(user, StaffCapability.MANAGE_SUPPORT):
                raise PermissionDenied()
            reference = self.request.query_params.get("operational_quote")
            if reference:
                queryset = queryset.filter(Q(quote__reference=reference) | Q(order__quote__reference=reference))
            return queryset.order_by("-updated_at", "-id")
        return queryset.filter(client=user).exclude(channel='email').order_by("-updated_at", "-id")

    @action(detail=False, methods=["get"])
    def contexts(self, request):
        if request.user.is_staff:
            raise PermissionDenied()
        kind = request.query_params.get("kind", "quote")
        if kind not in CONTEXT_MODELS:
            raise serializers.ValidationError({"kind": "Tipo de contexto inválido."})
        queryset = (
            CONTEXT_MODELS[kind].objects.filter(user=request.user).order_by("-created_at", "-pk")
        )
        if kind == "invoice":
            queryset = queryset.exclude(status=Invoice.STATUS_DRAFT)
        if kind == "order":
            queryset = queryset.select_related("quote")
        reference = request.query_params.get("reference", "").strip()[:30]
        search = request.query_params.get("q", "").strip()[:100]
        if reference:
            queryset = queryset.filter(reference=reference)
        elif search:
            queryset = queryset.filter(reference__icontains=search)
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response([context_data(kind, row, request.user) for row in page])

    @transaction.atomic
    def create(self, request):
        if request.user.is_staff:
            raise PermissionDenied("As conversas são iniciadas pelo cliente.")
        data = ConversationInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        if sum(bool(values.get(f"{kind}_reference")) for kind in CONTEXT_MODELS) > 1:
            raise serializers.ValidationError("Escolha apenas uma proposta, projeto ou fatura.")
        links = {}
        for field, model in CONTEXT_MODELS.items():
            ref = values.get(f"{field}_reference")
            if ref:
                target = model.objects.filter(reference=ref, user=request.user).first()
                if not target or not context_data(field, target, request.user)["available"]:
                    raise serializers.ValidationError(
                        {f"{field}_reference": "Referência indisponível nesta conta."}
                    )
                links[field] = target
        conversation = SupportConversation.objects.create(
            client=request.user, subject=values["subject"], **links
        )
        SupportMessage.objects.create(
            conversation=conversation, sender=request.user, body=values["body"]
        )
        notify_message(conversation, request.user)
        return Response(
            self.get_serializer(self.get_queryset().get(pk=conversation.pk)).data, status=201
        )

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.method == "GET":
            page = self.paginate_queryset(conversation.messages.all())
            return self.get_paginated_response(MessageSerializer(page, many=True).data)
        data = MessageInput(data=request.data)
        data.is_valid(raise_exception=True)
        if conversation.channel == 'email':
            if not request.user.is_staff:
                raise PermissionDenied()
            from .zoho_mail import send_reply
            request_id = data.validated_data.get('request_id')
            if not request_id:
                raise serializers.ValidationError('Identificador de envio obrigatório.')
            message = send_reply(conversation, request.user, data.validated_data['body'], request_id)
            return Response(MessageSerializer(message).data, status=201)
        data.validated_data.pop('request_id', None)
        if conversation.channel == "whatsapp":
            if not request.user.is_staff:
                raise PermissionDenied()
            from .whatsapp import send_text

            message = send_text(conversation, request.user, data.validated_data["body"])
            return Response(MessageSerializer(message).data, status=201)
        with transaction.atomic():
            conversation = SupportConversation.objects.select_for_update().get(pk=conversation.pk)
            message = SupportMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                is_staff=request.user.is_staff,
                **data.validated_data,
            )
            conversation.status = "awaiting_client" if request.user.is_staff else "awaiting_team"
            conversation.updated_at = timezone.now()
            conversation.save(update_fields=["status", "updated_at"])
            notify_message(conversation, request.user)
        return Response(MessageSerializer(message).data, status=201)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        conversation = self.get_object()
        data = serializers.IntegerField(min_value=1).run_validation(request.data.get("through_id"))
        if not conversation.messages.filter(pk=data).exists():
            raise serializers.ValidationError("Mensagem inválida.")
        field = "staff_read_id" if request.user.is_staff else "client_read_id"
        SupportConversation.objects.filter(pk=conversation.pk, **{f"{field}__lt": data}).update(
            **{field: data}
        )
        return Response({"detail": "Leitura registada."})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        conversation = self.get_object()
        if not request.user.is_staff:
            raise PermissionDenied()
        conversation.status = "resolved"
        conversation.save(update_fields=["status"])
        return Response(self.get_serializer(conversation).data)

    @action(detail=True, methods=["get"], url_path=r"attachments/(?P<message_id>[0-9]+)", throttle_classes=[WhatsAppReadThrottle])
    def attachment(self, request, pk=None, message_id=None):
        conversation = self.get_object()
        if not request.user.is_staff or conversation.channel != "whatsapp":
            raise PermissionDenied()
        from django.shortcuts import get_object_or_404

        from .whatsapp_media import media_response
        message = get_object_or_404(conversation.messages, pk=message_id)
        return media_response(message)

    @action(detail=True, methods=["get", "post"], throttle_classes=[WhatsAppReadThrottle])
    def templates(self, request, pk=None):
        conversation = self.get_object()
        if not request.user.is_staff or conversation.channel != "whatsapp":
            raise PermissionDenied()
        from .whatsapp_templates import list_templates, send_template

        if request.method == "GET":
            after = serializers.CharField(max_length=1024, allow_blank=True).run_validation(request.query_params.get("after", ""))
            return Response(list_templates(after=after))
        data = TemplateInput(data=request.data)
        data.is_valid(raise_exception=True)
        message = send_template(conversation, request.user, data.validated_data)
        return Response(MessageSerializer(message).data, status=201)
