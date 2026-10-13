import json
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.core.activity import record_activity
from apps.orders.models import Order
from apps.quotes.brand_requests import validated_attachments
from apps.quotes.material_briefing import MaterialBriefingSerializer
from apps.quotes.models import QuoteItem, QuoteRequest, QuoteRequestAttachment

from .models import PortalNotification, SupportConversation
from .permissions import HasStaffCapability
from .reception_briefing import reception_briefing
from .reception_hq import open_work, task_filters
from .reception_lease import acquire, lease_state, require_edit


def active_requests():
    return QuoteRequest.objects.filter(
        Q(status="received") | Q(status="reviewing"),
        reception_completed_at__isnull=True,
        proposal_prepared_by__isnull=True,
    )


def missing_information(quote):
    missing = []
    if not quote.client_name.strip():
        missing.append("Nome do cliente / empresa")
    if not quote.client_email.strip() and not quote.client_phone.strip():
        missing.append("E-mail ou telefone")
    details = quote.reception_briefing or {}
    if (
        not quote.items.all()
        and not quote.notes.strip()
        and not details.get("description", "").strip()
    ):
        missing.append("Descrição da necessidade")
    return missing


class ReceptionSerializer(serializers.ModelSerializer):
    edit_session = serializers.SerializerMethodField()

    def get_edit_session(self, obj):
        return lease_state(obj)
    briefing = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    missing_information = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    deadline = serializers.SerializerMethodField()

    def get_owner_name(self, obj):
        owner = obj.reception_owner
        return (owner.get_full_name() or owner.username) if owner else ""

    def get_missing_information(self, obj):
        return missing_information(obj)

    def get_items(self, obj):
        return [
            {
                "id": item.pk,
                "description": item.description
                or (item.product.name if item.product else "Material"),
                "quantity": item.quantity,
                "size": item.size,
                "material": item.material,
                "colors": item.colors,
                "specifications": item.notes,
                "material_briefing": item.material_briefing,
                "needs_design": item.needs_design,
            }
            for item in obj.items.all()
        ]

    def get_deadline(self, obj):
        return reception_briefing(obj)["deadline"]

    def get_briefing(self, obj):
        return reception_briefing(obj)

    def get_attachments(self, obj):
        return list(obj.request_attachments.values("id", "name", "size", "is_internal"))

    class Meta:
        model = QuoteRequest
        fields = [
            "reference",
            "edit_session",
            "client_name",
            "client_email",
            "client_phone",
            "client_nuit",
            "contact_source",
            "status",
            "urgency",
            "notes",
            "created_at",
            "reception_owner",
            "owner_name",
            "reception_notes",
            "reception_completed_at",
            "missing_information",
            "items",
            "deadline",
            "briefing",
            "attachments",
        ]


class ReceptionItemSerializer(serializers.Serializer):
    def validate(self, values):
        from apps.catalog.apparel import validate_distribution
        return validate_distribution(values)
    material_briefing = MaterialBriefingSerializer(required=False)
    id = serializers.IntegerField(min_value=1, required=False)
    description = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1, max_value=1000000)
    size = serializers.CharField(max_length=100, required=False, allow_blank=True)
    material = serializers.CharField(max_length=100, required=False, allow_blank=True)
    colors = serializers.CharField(max_length=100, required=False, allow_blank=True)
    specifications = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    needs_design = serializers.BooleanField(required=False)

    def to_internal_value(self, data):
        if isinstance(data, dict) and set(data) - set(self.fields):
            raise ValidationError(
                "Preços e vínculos de catálogo não podem ser alterados na triagem."
            )
        return super().to_internal_value(data)


class ReceptionBriefingSerializer(serializers.Serializer):
    project_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(max_length=20000, required=False, allow_blank=True)
    deadline = serializers.DateField(required=False, allow_null=True)
    fulfilment = serializers.ChoiceField(
        choices=["", "pickup", "delivery", "installation"], required=False
    )
    delivery_address = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    source_reference = serializers.CharField(max_length=50, required=False, allow_blank=True)
    needs_design = serializers.BooleanField(required=False)
    questions = serializers.CharField(max_length=4000, required=False, allow_blank=True)

    def to_internal_value(self, data):
        if isinstance(data, dict) and set(data) - set(self.fields):
            raise ValidationError("Campo não permitido no briefing.")
        return super().to_internal_value(data)


class ReceptionEditSerializer(serializers.Serializer):
    briefing = ReceptionBriefingSerializer(required=False)
    items = ReceptionItemSerializer(many=True, required=False, max_length=50)
    client_name = serializers.CharField(max_length=255, required=False)
    client_email = serializers.EmailField(required=False, allow_blank=True)
    client_phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    client_nuit = serializers.CharField(max_length=50, required=False, allow_blank=True)
    reception_notes = serializers.CharField(max_length=10000, required=False, allow_blank=True)

    def validate(self, attrs):
        unexpected = set(self.initial_data) - set(self.fields)
        if unexpected:
            raise ValidationError(
                "Só pode editar os contactos, briefing, materiais e notas de triagem."
            )
        return attrs


class ReceptionFollowUpSerializer(serializers.Serializer):
    date = serializers.DateField(allow_null=True)
    note = serializers.CharField(max_length=500, allow_blank=True, default="")

    def validate(self, attrs):
        if set(self.initial_data) - set(self.fields):
            raise ValidationError("Só pode alterar a data e a nota de seguimento.")
        if attrs["date"] and attrs["date"] < timezone.localdate():
            raise ValidationError({"date": "Escolha hoje ou uma data futura."})
        if not attrs["date"]:
            attrs["note"] = ""
        return attrs


class ReceptionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ReceptionSerializer
    lookup_field = "reference"

    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.MANAGE_RECEPTION)]

    def get_queryset(self):
        if self.action in {"follow_up", "edit_session"}:
            return open_work(QuoteRequest.objects.all()).select_related("reception_owner")
        queryset = (
            active_requests().select_related("reception_owner").prefetch_related("items__product")
        )
        if self.request.query_params.get("scope") == "mine":
            queryset = queryset.filter(reception_owner=self.request.user)
        elif self.request.query_params.get("scope") == "unassigned":
            queryset = queryset.filter(reception_owner__isnull=True)
        return queryset.order_by("-urgency", "created_at", "id")

    @action(detail=False, methods=["get"])
    def hq(self, request):
        work = open_work(QuoteRequest.objects.all())
        unassigned = work.filter(reception_owner__isnull=True).count()
        scope = request.query_params.get("scope", "all")
        if scope == "mine":
            work = work.filter(reception_owner=request.user)
        elif scope == "unassigned":
            work = work.filter(reception_owner__isnull=True)
        counts = {key: work.filter(condition).count() for key, condition in task_filters().items()}
        counts["total"] = work.count()
        counts["urgent"] = work.filter(urgency="urgent").count()
        conversations = SupportConversation.objects.filter(status="awaiting_team").filter(
            Q(quote__in=work) | Q(order__quote__in=work)
        )
        counts["messages"] = conversations.count()
        counts["messages_general"] = SupportConversation.objects.filter(
            status="awaiting_team", quote__isnull=True, order__isnull=True, invoice__isnull=True
        ).count()
        counts["upcoming"] = work.filter(
            order__scheduled_date__gte=timezone.now(),
            order__scheduled_date__lte=timezone.now() + timedelta(days=7),
        ).count()
        return Response({"scope": scope, "counts": counts, "unassigned_team": unassigned,
                         "updated_at": timezone.now()})

    @action(detail=True, methods=["post"], url_path="follow-up")
    @transaction.atomic
    def follow_up(self, request, reference=None):
        target = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=target.pk)
        require_edit(quote, request)
        # Recheck after taking the row lock: a concurrently closed order is not actionable.
        if not open_work(QuoteRequest.objects.filter(pk=quote.pk)).exists():
            raise ValidationError("O pedido já foi encerrado.")
        data = ReceptionFollowUpSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        quote.reception_follow_up_date = data.validated_data["date"]
        quote.reception_follow_up_note = data.validated_data["note"]
        quote.save(update_fields=["reception_follow_up_date", "reception_follow_up_note", "updated_at"])
        record_activity(action="reception_follow_up", actor=request.user, quote=quote, is_internal=True,
                        comment=f"Seguimento agendado: {quote.reception_follow_up_date}. {quote.reception_follow_up_note}" if quote.reception_follow_up_date else "Seguimento concluído / removido da agenda.")
        return Response({"date": quote.reception_follow_up_date, "note": quote.reception_follow_up_note})

    @action(detail=True, methods=["get", "post"], url_path="edit-session")
    @transaction.atomic
    def edit_session(self, request, reference=None):
        quote = QuoteRequest.objects.select_for_update().get(pk=self.get_object().pk)
        if request.method == "GET":
            return Response({"session": lease_state(quote)})
        command = serializers.ChoiceField(choices=["acquire", "heartbeat", "release", "takeover"]).run_validation(request.data.get("action"))
        if command == "release":
            require_edit(quote, request)
            quote.reception_edit_lease.delete()
            record_activity(action="reception_released", actor=request.user, quote=quote, is_internal=True,
                            comment="Reserva de edição libertada; pedido disponível para toda a Recepção.")
            return Response({"session": None})
        if command == "heartbeat":
            require_edit(quote, request)
        if not open_work(QuoteRequest.objects.filter(pk=quote.pk)).exists():
            raise ValidationError("O pedido já foi encerrado; consulte o histórico.")
        reason = ""
        if command == "takeover":
            if not has_staff_capability(request.user, StaffCapability.REVIEW_PROPOSALS):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied("Só a supervisão pode retomar uma edição ativa.")
            reason = serializers.CharField(max_length=500, allow_blank=False).run_validation(request.data.get("reason"))
        lease = acquire(quote, request, reason)
        return Response({"session": {"editor_id": lease.editor_id, "editor_name": request.user.get_full_name() or request.user.username, "expires_at": lease.expires_at}, "token": str(lease.token)})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = active_requests()
        messages = SupportConversation.objects.filter(status="awaiting_team").select_related(
            "client__profile"
        )
        ready = Order.objects.filter(status="ready").order_by("updated_at", "id")
        recent = QuoteRequest.objects.filter(reception_completed_at__isnull=False).order_by(
            "-reception_completed_at"
        )[:5]
        return Response(
            {
                "counts": {
                    "queue": queryset.count(),
                    "unassigned": queryset.filter(reception_owner__isnull=True).count(),
                    "mine": queryset.filter(reception_owner=request.user).count(),
                    "messages": messages.count(),
                    "ready": ready.count(),
                },
                "messages": [
                    {
                        "id": row.pk,
                        "subject": row.subject,
                        "client_name": row.contact_name
                        or row.whatsapp_phone
                        or getattr(getattr(row.client, "profile", None), "company", "")
                        or (row.client.get_full_name() if row.client else "")
                        or "Cliente MP",
                    }
                    for row in messages.order_by("updated_at", "id")[:5]
                ],
                "ready": [{"reference": row.reference} for row in ready[:5]],
                "handovers": [
                    {
                        "reference": row.reference,
                        "client_name": row.client_name,
                        "completed_at": row.reception_completed_at,
                    }
                    for row in recent
                ],
            }
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def claim(self, request, reference=None):
        target = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=target.pk)
        if quote.reception_completed_at or quote.status not in {"received", "reviewing"}:
            raise ValidationError("Este pedido já saiu da triagem.")
        lease = acquire(quote, request)
        previous = quote.status
        quote.reception_owner = request.user
        quote.status = "reviewing"
        quote.save(update_fields=["reception_owner", "status", "updated_at"])
        if previous != quote.status:
            record_activity(
                action="reception_claimed",
                actor=request.user,
                quote=quote,
                from_status=previous,
                to_status=quote.status,
                comment="Triagem assumida pela Recepção.",
                is_internal=True,
            )
        return Response({**self.get_serializer(quote).data, "edit_token": str(lease.token)})

    @transaction.atomic
    def partial_update(self, request, reference=None):
        target = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=target.pk)
        self.check_owned(quote)
        payload = request.data
        if quote.proposal_prepared_by_id:
            raise ValidationError("O briefing já entrou na preparação da proposta. Faça os ajustes em Rever proposta; as condições exigirão nova aprovação.")
        if "payload" in request.data:
            try:
                payload = json.loads(request.data["payload"])
            except (TypeError, ValueError) as exc:
                raise ValidationError({"detail": "Briefing inválido."}) from exc
        data = ReceptionEditSerializer(data=payload)
        data.is_valid(raise_exception=True)
        files = validated_attachments(request.FILES.getlist("files"))
        private = list(quote.request_attachments.filter(is_internal=True).values("size"))
        if (
            len(private) + len(files) > 5
            or sum(file["size"] for file in private + files) > 3 * 1024 * 1024
        ):
            raise ValidationError(
                {"detail": "As referências internas admitem até 5 anexos e 3 MB no total."}
            )
        values = dict(data.validated_data)
        items = values.pop("items", None)
        briefing = values.pop("briefing", None)
        existing = {item.pk: item for item in quote.items.all()}
        if items is not None:
            ids = [item["id"] for item in items if item.get("id")]
            if len(ids) != len(set(ids)) or set(ids) != set(existing):
                raise ValidationError(
                    {
                        "detail": "Mantenha os materiais existentes e use apenas os identificadores deste pedido."
                    }
                )
        # Preserve the source before completing the canonical item rows used by Commercial.
        working = dict(quote.reception_briefing or {})
        if "_original" not in working:
            working["_original"] = {
                "notes": quote.notes,
                "briefing": quote.briefing,
                "items": [
                    {
                        "id": item.pk,
                        "description": item.description,
                        "quantity": item.quantity,
                        "size": item.size,
                        "material": item.material,
                        "colors": item.colors,
                        "specifications": item.notes,
                        "material_briefing": item.material_briefing,
                        "needs_design": item.needs_design,
                        "product_id": item.product_id,
                        "product_variant_id": item.product_variant_id,
                        "artwork_file": item.artwork_file.name,
                    }
                    for item in existing.values()
                ],
            }
        if briefing is not None:
            if briefing.get("deadline"):
                briefing["deadline"] = briefing["deadline"].isoformat()
            working.update(briefing)
        quote.reception_briefing = working
        for key, value in values.items():
            setattr(quote, key, value)
        quote.save(update_fields=[*values, "reception_briefing", "updated_at"])
        if items is not None:
            for position, values in enumerate(items):
                item_id = values.pop("id", None)
                item = existing[item_id] if item_id else QuoteItem(quote=quote)
                from apps.catalog.apparel import validate_distribution
                validate_distribution(values, item)
                for key, value in values.items():
                    setattr(item, "notes" if key == "specifications" else key, value)
                item.position = position
                item.save()
        for file in files:
            QuoteRequestAttachment.objects.create(quote=quote, is_internal=True, **file)
        record_activity(
            action="reception_updated",
            actor=request.user,
            quote=quote,
            comment="Triagem alterada: " + ", ".join(sorted(data.validated_data)) + ". "
            + (f"{len(files)} referência(s) interna(s) adicionada(s)." if files else ""),
            is_internal=True,
        )
        return Response(self.get_serializer(quote).data)

    def check_owned(self, quote):
        require_edit(quote, self.request)
        if quote.reception_completed_at or quote.status not in {"received", "reviewing"}:
            raise ValidationError("Este pedido já saiu da triagem.")

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def release(self, request, reference=None):
        target = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=target.pk)
        if quote.reception_completed_at or quote.status not in {"received", "reviewing"}:
            raise ValidationError("Este pedido já saiu da triagem.")
        require_edit(quote, request)
        quote.reception_edit_lease.delete()
        previous = quote.status
        quote.reception_owner = None
        quote.status = "received"
        quote.save(update_fields=["reception_owner", "status", "updated_at"])
        record_activity(
            action="reception_released",
            actor=request.user,
            quote=quote,
            from_status=previous,
            to_status="received",
            comment="Atendimento devolvido à fila da Recepção.",
            is_internal=True,
        )
        return Response(self.get_serializer(quote).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def handoff(self, request, reference=None):
        target = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=target.pk)
        self.check_owned(quote)
        missing = missing_information(quote)
        if missing:
            raise ValidationError({"detail": "Complete antes de encaminhar: " + ", ".join(missing)})
        quote.reception_completed_at = timezone.now()
        quote.status = "reviewing"
        quote.save(update_fields=["reception_completed_at", "status", "updated_at"])
        record_activity(
            action="reception_handoff",
            actor=request.user,
            quote=quote,
            from_status="reviewing",
            to_status="reviewing",
            comment="Triagem concluída; proposta a preparar pela Receção no mesmo pedido. " + quote.reception_notes,
            is_internal=True,
        )
        recipients = [
            user
            for user in User.objects.filter(is_staff=True, is_active=True).select_related("profile")
            if user.pk != request.user.pk
            and has_staff_capability(user, StaffCapability.MANAGE_QUOTES)
        ]
        PortalNotification.objects.bulk_create(
            [
                PortalNotification(
                    recipient=user,
                    title=f"Briefing concluído: {quote.reference}",
                    href=f"/admin/orcamentos/{quote.reference}",
                )
                for user in recipients
            ]
        )
        return Response(
            {"detail": "Pedido encaminhado ao Comercial.", "reference": quote.reference}
        )
