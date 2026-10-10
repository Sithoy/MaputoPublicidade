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
from apps.orders.models import Order
from apps.quotes.models import QuoteRequest

from .models import PortalNotification, SupportConversation, SupportMessage


class SupportWriteThrottle(UserRateThrottle):
    rate = "30/min"

    def allow_request(self, request, view):
        return request.method in {"GET", "HEAD", "OPTIONS"} or super().allow_request(request, view)


class MessageInput(serializers.Serializer):
    body = serializers.CharField(max_length=4000)


class ConversationInput(MessageInput):
    subject = serializers.CharField(max_length=160)
    quote_reference = serializers.CharField(max_length=30, required=False, allow_blank=True)
    order_reference = serializers.CharField(max_length=30, required=False, allow_blank=True)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportMessage
        fields = ["id", "body", "is_staff", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    quote_reference = serializers.CharField(source="quote.reference", default="")
    order_reference = serializers.CharField(source="order.reference", default="")
    unread_count = serializers.IntegerField(read_only=True)

    def get_client_name(self, obj):
        profile = getattr(obj.client, "profile", None)
        return getattr(profile, "company", "") or obj.client.get_full_name() or "Cliente MP"

    class Meta:
        model = SupportConversation
        fields = [
            "id",
            "subject",
            "client_name",
            "quote_reference",
            "order_reference",
            "status",
            "unread_count",
            "updated_at",
        ]


def notify_message(conversation, sender):
    if sender.is_staff:
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
            if u.pk != sender.pk
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
            "client__profile", "quote", "order"
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
            return queryset.order_by("-updated_at", "-id")
        return queryset.filter(client=user).order_by("-updated_at", "-id")

    @transaction.atomic
    def create(self, request):
        if request.user.is_staff:
            raise PermissionDenied("As conversas são iniciadas pelo cliente.")
        data = ConversationInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        if values.get("quote_reference") and values.get("order_reference"):
            raise serializers.ValidationError("Escolha apenas um pedido ou projeto.")
        links = {}
        for field, model in (("quote", QuoteRequest), ("order", Order)):
            ref = values.get(f"{field}_reference")
            if ref:
                target = model.objects.filter(reference=ref, user=request.user).first()
                if not target:
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
