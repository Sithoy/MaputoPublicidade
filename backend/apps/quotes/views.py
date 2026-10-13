import base64
import json
import os
from io import BytesIO

from django.db import transaction
from django.db.models import Prefetch, Q
from django.http import FileResponse
from django.utils import timezone
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.core.activity import record_activity
from apps.core.documents import build_quote_pdf
from apps.core.export_utils import export_response
from apps.core.models import ActivityEvent
from apps.core.notifications import (
    notify_artwork_proof_uploaded,
    notify_order_created,
    notify_quote_ready,
    notify_quote_received,
    notify_quote_status_changed,
)
from apps.core.permissions import HasStaffCapability, IsOwnerOrStaff
from apps.orders.models import Order, OrderItem

from .brand_requests import BrandRequestSerializer, BrandRequestThrottle, validated_attachments
from .models import (
    ArtworkApproval,
    ArtworkProofVersion,
    ProposalPreparation,
    QuoteItem,
    QuoteRequest,
    QuoteRequestAttachment,
)
from .proposal_assistant import PreparationThrottle, extract_draft, prepare_sources
from .proposal_workflow import DOCUMENT_FIELDS, prepare, require_sent, transition
from .serializers import (
    ArtworkApprovalSerializer,
    ArtworkProofSerializer,
    ManualQuoteCreateSerializer,
    QuoteApprovalSerializer,
    QuoteChangeRequestSerializer,
    QuotePriceSerializer,
    QuoteRequestCreateSerializer,
    QuoteRequestDetailSerializer,
    QuoteRequestListSerializer,
    QuoteRequestUpdateSerializer,
    QuoteStatusSerializer,
    ReceptionIntakeSerializer,
)


def create_order_from_quote(
    quote,
    *,
    delivery_method=Order.DELIVERY_PICKUP,
    delivery_address="",
):
    order = Order.objects.create(
        user=quote.user,
        quote=quote,
        estimated_price=quote.estimated_price,
        final_price=quote.final_price,
        status=Order.STATUS_APPROVED,
        delivery_method=delivery_method,
        delivery_address=delivery_address,
    )

    for idx, quote_item in enumerate(quote.items.all()):
        order_item = OrderItem.objects.create(
            order=order,
            product=quote_item.product,
            product_variant=quote_item.product_variant,
            description=quote_item.description,
            quantity=quote_item.quantity,
            size=quote_item.size,
            material=quote_item.material,
            colors=quote_item.colors,
            needs_design=quote_item.needs_design,
            notes=quote_item.notes,
            material_briefing=quote_item.material_briefing,
            unit_price=quote_item.unit_price,
            position=idx,
        )
        if quote_item.artwork_file:
            filename = os.path.basename(quote_item.artwork_file.name)
            order_item.artwork_file.save(filename, quote_item.artwork_file, save=True)

    return order


class QuoteRequestViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = (
        QuoteRequest.objects.all()
        .select_related("artwork", "user", "order", "reception_owner", "price_approved_by", "proposal_prepared_by", "proposal_reviewed_by", "reception_edit_lease__editor")
        .prefetch_related("items", "items__product", "items__product_variant", Prefetch("proof_versions", queryset=ArtworkProofVersion.objects.defer("private_content")))
    )
    lookup_field = "reference"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @transaction.atomic
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def get_object(self):
        quote = super().get_object()
        if self.request.method not in {"GET", "HEAD", "OPTIONS"} and self.request.user.is_staff:
            from apps.core.reception_lease import protect_staff_write

            quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
            protect_staff_write(quote, self.request)
        return quote

    def get_serializer_class(self):
        if self.action == "intake":
            return ReceptionIntakeSerializer
        if self.action == "manual":
            return ManualQuoteCreateSerializer
        if self.action == "create":
            return QuoteRequestCreateSerializer
        if self.action in {"partial_update", "update"}:
            return QuoteRequestUpdateSerializer
        if self.action in ["retrieve", "approve", "request_change"]:
            return QuoteRequestDetailSerializer
        return QuoteRequestListSerializer

    def get_permissions(self):
        if self.action == 'apparel_distribution':
            return [HasStaffCapability(StaffCapability.MANAGE_QUOTES)]
        if self.action == "destroy":
            return [HasStaffCapability(StaffCapability.REVIEW_PROPOSALS)]
        if self.action == "proposal_workflow":
            capability = StaffCapability.REVIEW_PROPOSALS if self.request.data.get("action") in {"approve", "return"} else StaffCapability.MANAGE_QUOTES
            return [HasStaffCapability(capability)]
        if self.action == "brand_request":
            return [IsAuthenticated()]
        if self.action == "intake":
            if self.request.data.get("outcome") == "quote" and has_staff_capability(self.request.user, StaffCapability.MANAGE_QUOTES):
                return [HasStaffCapability(StaffCapability.MANAGE_QUOTES)]
            return [HasStaffCapability(StaffCapability.CREATE_INTAKE)]
        if self.action == "create":
            return [AllowAny()]
        if self.action in ["manual", "prepare", "source", "proposal"]:
            return [HasStaffCapability(StaffCapability.MANAGE_QUOTES)]
        if self.action in ["approve", "request_change", "approve_price"]:
            return [
                IsAuthenticated(),
                IsOwnerOrStaff(
                    owner_field="user",
                    staff_capability=StaffCapability.MANAGE_QUOTES,
                ),
            ]
        if self.action == "upload_proof":
            return [HasStaffCapability(StaffCapability.MANAGE_ARTWORK), HasStaffCapability(StaffCapability.VIEW_QUOTES)]
        if self.action == "export":
            return [HasStaffCapability(StaffCapability.EXPORT_QUOTES)]
        if self.action in [
            "set_status",
            "set_price",
            "convert_to_order",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [HasStaffCapability(StaffCapability.MANAGE_QUOTES)]
        return [
            IsAuthenticated(),
            IsOwnerOrStaff(
                owner_field="user",
                staff_capability=StaffCapability.VIEW_QUOTES,
            ),
        ]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_staff:
            queryset = self.queryset
            if has_staff_capability(user, StaffCapability.MANAGE_RECEPTION):
                from apps.core.reception_hq import with_workdesk

                queryset = with_workdesk(queryset)
            user_filter = self.request.query_params.get("user")
            if user_filter:
                if not user_filter.isdigit():
                    return queryset.none()
                queryset = queryset.filter(user_id=int(user_filter))
            queue = self.request.query_params.get("proposal_queue", "")
            if queue == "mine":
                queryset = queryset.filter(reception_owner=user)
            elif queue == "review":
                queryset = queryset.filter(proposal_stage="review")
            if self.request.query_params.get("operational_scope") == "unassigned":
                queryset = queryset.filter(reception_owner__isnull=True)
            state = self.request.query_params.get("operational_state")
            if state == "active":
                queryset = queryset.exclude(status="cancelled").exclude(order__status="delivered")
            elif state == "waiting":
                queryset = queryset.filter(proposal_stage__in=["review", "sent"], price_approved_at__isnull=True, order__isnull=True)
            elif state == "closed":
                queryset = queryset.filter(Q(status="cancelled") | Q(order__status="delivered"))
            if self.request.query_params.get("hq") == "1":
                from apps.core.reception_hq import open_work, prioritize, task_filters

                if state != "closed":
                    queryset = open_work(queryset)
                task = self.request.query_params.get("task", "")
                filters = task_filters()
                if task in filters:
                    queryset = queryset.filter(filters[task])
                elif task == "messages":
                    from apps.core.models import SupportConversation

                    conversations = SupportConversation.objects.filter(status="awaiting_team")
                    queryset = queryset.filter(Q(pk__in=conversations.values("quote_id")) | Q(pk__in=conversations.values("order__quote_id")))
                search = self.request.query_params.get("search", "").strip()[:80]
                if search:
                    queryset = queryset.filter(Q(reference__icontains=search) | Q(client_name__icontains=search) | Q(client_company__icontains=search))
                queryset = prioritize(queryset)
            return queryset
        return self.queryset.filter(user=user)

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        fmt = request.query_params.get("format", "csv")
        queryset = self.get_queryset()

        status_filter = request.query_params.get("status")
        urgency_filter = request.query_params.get("urgency")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if urgency_filter:
            queryset = queryset.filter(urgency=urgency_filter)
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        field_map = {
            "Referencia": "reference",
            "Data": lambda obj: obj.created_at.strftime("%Y-%m-%d %H:%M"),
            "Cliente": "client_name",
            "Email": "client_email",
            "Telefone": "client_phone",
            "Empresa": "client_company",
            "Origem": lambda obj: obj.get_contact_source_display(),
            "Estado": lambda obj: obj.get_status_display(),
            "Urgencia": lambda obj: obj.get_urgency_display(),
            "Preco estimado": "estimated_price",
            "Preco final": "final_price",
            "Itens": lambda obj: "; ".join(f"{i.description} x{i.quantity}" for i in obj.items.all()),
            "Encomenda": lambda obj: obj.order.reference if hasattr(obj, "order") and obj.order else "",
            "Notas": "notes",
        }

        return export_response(queryset, field_map, "orcamentos", fmt)

    def create(self, request, *args, **kwargs):
        serializer = QuoteRequestCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            quote=quote,
            actor=request.user,
        )
        notify_quote_received(quote)
        detail = QuoteRequestDetailSerializer(quote, context={"request": request})
        from apps.core.tracking_views import tracking_token

        response = Response({**detail.data, "tracking_token": tracking_token(quote)}, status=status.HTTP_201_CREATED)
        response["Cache-Control"] = "no-store, private"
        return response

    @action(detail=False, methods=["post"], url_path="brand-request", throttle_classes=[BrandRequestThrottle])
    @transaction.atomic
    def brand_request(self, request):
        try:
            payload = json.loads(request.data.get("payload", "{}"))
        except (TypeError, ValueError) as exc:
            raise ValidationError({"detail": "Briefing inválido."}) from exc
        serializer = BrandRequestSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        files = validated_attachments(request.FILES.getlist("files"))
        data = serializer.validated_data
        profile = getattr(request.user, "profile", None)
        company = getattr(profile, "company", "")
        briefing = {key: value for key, value in data.items() if key != "items"}
        if briefing.get("deadline"):
            briefing["deadline"] = briefing["deadline"].isoformat()
        labels = {"quote": "Pedido de orçamento", "catalogue": "Produto do catálogo", "reorder": "Repetição de encomenda", "campaign": "Evento ou campanha", "guidance": "Apoio para escolher uma solução"}
        fulfilment_labels = {"pickup": "Levantamento na MP", "delivery": "Entrega", "installation": "Entrega e instalação"}
        notes = [f"Projeto: {data['project_name']}", f"Objetivo: {labels[data['intent']]}",
                 f"Recepção: {fulfilment_labels[data['fulfilment']]}", data.get("notes", "")]
        if data.get("deadline"):
            notes.append(f"Data pretendida (a confirmar pela MP): {data['deadline']}")
        if data.get("source_reference"):
            notes.append(f"Referência anterior: {data['source_reference']}")
        quote = QuoteRequest.objects.create(user=request.user, proposal_stage="draft",
            client_name=company or request.user.get_full_name() or request.user.email,
            client_email=request.user.email, client_phone=getattr(profile, "phone", ""),
            client_company="", client_nuit=getattr(profile, "nuit", ""),
            urgency=data["urgency"], briefing=briefing, notes="\n".join(filter(None, notes)))
        for position, item in enumerate(data["items"]):
            QuoteItem.objects.create(quote=quote, description=item["description"], quantity=item["quantity"],
                notes=item.get("specifications", ""), material_briefing=item.get("material_briefing", {}),
                needs_design=data["needs_design"], position=position)
        for file in files:
            QuoteRequestAttachment.objects.create(quote=quote, **file)
        record_activity(action=ActivityEvent.ACTION_CREATED, quote=quote, actor=request.user,
                        comment="Pedido recebido pelo BrandDesk; briefing e anexos aguardam análise comercial.")
        notify_quote_received(quote)
        return Response(QuoteRequestDetailSerializer(quote, context={"request": request}).data, status=201)

    @action(detail=True, methods=["get"], url_path="attachment")
    def attachment(self, request, reference=None):
        quote = self.get_object()
        attachment_id = request.query_params.get("id", "")
        if not attachment_id.isdigit():
            raise ValidationError({"detail": "Anexo inválido."})
        from django.shortcuts import get_object_or_404

        file = get_object_or_404(quote.request_attachments, pk=int(attachment_id))
        if file.is_internal and not (
            has_staff_capability(request.user, StaffCapability.MANAGE_RECEPTION)
            or has_staff_capability(request.user, StaffCapability.MANAGE_QUOTES)
        ):
            from rest_framework.exceptions import NotFound

            raise NotFound()
        preview = request.query_params.get("preview") == "1"
        content = bytes(file.content)
        content_type = "application/octet-stream"
        if preview:
            from PIL import Image

            try:
                with Image.open(BytesIO(content)) as image:
                    content_type = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}.get(image.format)
                    if not content_type or image.width * image.height > 20000000:
                        raise ValueError()
                    image.verify()
            except (ValueError, OSError, SyntaxError, EOFError, Image.DecompressionBombError) as exc:
                raise ValidationError({"detail": "Pré-visualização disponível apenas para imagens JPG, PNG e WebP válidas."}) from exc
        response = FileResponse(BytesIO(content), as_attachment=not preview, filename=file.name, content_type=content_type)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @action(detail=False, methods=["post"], url_path="prepare", throttle_classes=[PreparationThrottle])
    def prepare(self, request):
        channel = request.data.get("source_channel", "other")
        if channel not in {"email", "whatsapp", "phone", "walk_in", "other"}:
            raise ValidationError({"source_channel": "Origem inválida."})
        text = request.data.get("text", "")
        parts, originals = prepare_sources(text, request.FILES.getlist("files"))
        draft = extract_draft(parts)
        preparation = ProposalPreparation.objects.create(
            created_by=request.user, source_channel=channel, source_text=text,
            source_files=originals, draft=draft,
        )
        return Response({"id": preparation.id, "draft": draft, "files": [item["name"] for item in originals]}, status=201)

    @action(detail=True, methods=["get"], url_path="source")
    def source(self, request, reference=None):
        quote = self.get_object()
        preparation = ProposalPreparation.objects.filter(quote=quote).first()
        if not preparation:
            return Response({"source": None})
        file_index = request.query_params.get("file")
        if file_index is not None:
            if not file_index.isdigit() or int(file_index) >= len(preparation.source_files):
                raise ValidationError({"file": "Anexo não encontrado."})
            file = preparation.source_files[int(file_index)]
            return FileResponse(BytesIO(base64.b64decode(file["data"])), as_attachment=True,
                                filename=file["name"], content_type="application/octet-stream")
        return Response({"source": {
            "channel": preparation.source_channel, "text": preparation.source_text,
            "draft": preparation.draft, "files": [file["name"] for file in preparation.source_files],
        }})

    @action(detail=True, methods=["post"], url_path="proposal")
    @transaction.atomic
    def proposal(self, request, reference=None):
        original = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=original.pk)
        if quote.status not in {QuoteRequest.STATUS_RECEIVED, QuoteRequest.STATUS_REVIEWING, QuoteRequest.STATUS_QUOTED} or Order.objects.filter(quote=quote).exists():
            raise ValidationError({"detail": "Este pedido já não pode ser preparado como proposta."})
        if request.data.get("preparation_id") is not None:
            raise ValidationError({"preparation_id": "Prepare os itens do pedido original sem substituir as fontes."})
        serializer = ManualQuoteCreateSerializer(quote, data=request.data)
        serializer.is_valid(raise_exception=True)
        prepare(quote, request.user)
        previous_status = quote.status
        quote = serializer.save()
        quote.status = "reviewing"
        quote.save(update_fields=["status"])
        record_activity(action=ActivityEvent.ACTION_STATUS_CHANGED, quote=quote, actor=request.user,
                        from_status=previous_status, to_status=quote.status,
                        comment="Proposta preparada no pedido original; referência e anexos preservados.")
        return Response(QuoteRequestDetailSerializer(quote, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="manual")
    @transaction.atomic
    def manual(self, request):
        preparation = None
        preparation_id = request.data.get("preparation_id")
        if preparation_id is not None:
            if not isinstance(preparation_id, int) or isinstance(preparation_id, bool):
                raise ValidationError({"preparation_id": "Rascunho inválido."})
            preparation = ProposalPreparation.objects.select_for_update().filter(
                pk=preparation_id, created_by=request.user,
            ).first()
            if not preparation:
                raise ValidationError({"preparation_id": "Rascunho não encontrado."})
            if preparation.quote_id:
                return Response(QuoteRequestDetailSerializer(preparation.quote, context={"request": request}).data)
            if request.data.get("ai_reviewed") is not True:
                raise ValidationError({"ai_reviewed": "Confirme a revisão dos dados, preços e condições."})
        serializer = ManualQuoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        prepare(quote, request.user)
        if preparation:
            preparation.quote = quote
            preparation.save(update_fields=["quote"])
            quote.contact_source = preparation.source_channel if preparation.source_channel != "other" else "web"
            quote.save(update_fields=["contact_source"])
        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            quote=quote,
            actor=request.user,
            comment="Proposta criada pela equipa comercial.",
        )
        return Response(
            QuoteRequestDetailSerializer(
                quote, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="intake")
    @transaction.atomic
    def intake(self, request):
        if request.data.get("outcome") == "confirmed_order" and not has_staff_capability(request.user, StaffCapability.REVIEW_PROPOSALS):
            raise ValidationError("Prepare a proposta e obtenha aprovação do Comercial antes de confirmar a encomenda.")
        serializer = ReceptionIntakeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        outcome = serializer.validated_data["outcome"]
        delivery_method = serializer.validated_data.get(
            "delivery_method", Order.DELIVERY_PICKUP
        )
        delivery_address = serializer.validated_data.get("delivery_address", "")
        quote = serializer.save()
        source_label = quote.get_contact_source_display()

        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            quote=quote,
            actor=request.user,
            comment=f"Atendimento registado via {source_label}.",
        )

        if outcome == ReceptionIntakeSerializer.OUTCOME_QUOTE:
            notify_quote_received(quote)
            return Response(
                {
                    "outcome": outcome,
                    "quote_reference": quote.reference,
                    "order_reference": None,
                    "quote": QuoteRequestDetailSerializer(
                        quote, context={"request": request}
                    ).data,
                },
                status=status.HTTP_201_CREATED,
            )

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.price_approved_at = timezone.now()
        quote.price_approved_by = request.user
        quote.price_approval_comment = (
            f"Aprovação do cliente registada no atendimento via {source_label}."
        )
        quote.save(
            update_fields=[
                "status",
                "price_approved_at",
                "price_approved_by",
                "price_approval_comment",
                "updated_at",
            ]
        )
        record_activity(
            action=ActivityEvent.ACTION_PRICE_APPROVED,
            quote=quote,
            actor=request.user,
            from_status=old_status,
            to_status=quote.status,
            comment=quote.price_approval_comment,
        )

        order = create_order_from_quote(
            quote,
            delivery_method=delivery_method,
            delivery_address=delivery_address,
        )
        record_activity(
            action=ActivityEvent.ACTION_CONVERTED_TO_ORDER,
            quote=quote,
            actor=request.user,
            comment=f"Encomenda {order.reference}",
        )
        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            order=order,
            actor=request.user,
            comment=f"Atendimento {source_label}; proposta {quote.reference}",
        )
        notify_order_created(order)

        return Response(
            {
                "outcome": outcome,
                "quote_reference": quote.reference,
                "order_reference": order.reference,
                "quote": QuoteRequestDetailSerializer(
                    quote, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @transaction.atomic
    def perform_update(self, serializer):
        quote = QuoteRequest.objects.select_for_update().get(pk=serializer.instance.pk)
        values = serializer.validated_data
        if values.get('status') == 'in_production':
            from apps.catalog.apparel import require_apparel_ready
            require_apparel_ready(quote)
        if "status" in values and values["status"] in {"quoted", "approved", "in_production", "ready", "delivered"}:
            require_sent(quote)
        if any(field in values and values[field] != getattr(quote, field) for field in DOCUMENT_FIELDS):
            prepare(quote, self.request.user)
            if "status" in values:
                values["status"] = "reviewing"
        serializer.instance = quote
        serializer.save()
        record_activity(action="reception_updated", actor=self.request.user, quote=quote, is_internal=True,
                        comment="Pedido alterado: " + ", ".join(sorted(values)))

    @action(detail=True, methods=["post"], url_path="proposal-workflow")
    @transaction.atomic
    def proposal_workflow(self, request, reference=None):
        original = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=original.pk)
        command = serializers.ChoiceField(choices=["submit", "approve", "return", "send"]).run_validation(request.data.get("action"))
        version = serializers.IntegerField(min_value=0).run_validation(request.data.get("version"))
        comment = serializers.CharField(max_length=3000, allow_blank=True).run_validation(request.data.get("comment", ""))
        transition(quote, request.user, command, version, comment)
        if command in {"submit", "send"}:
            from apps.core.models import ReceptionEditLease

            ReceptionEditLease.objects.filter(quote=quote, editor=request.user).delete()
        if command == "send":
            notify_quote_ready(quote)
        return Response(QuoteRequestDetailSerializer(quote, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, reference=None):
        quote = self.get_object()
        if not request.user.is_staff:
            require_sent(quote)
        content = build_quote_pdf(quote)
        response = FileResponse(BytesIO(content), content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="Proposta-{quote.reference}.pdf"'
        )
        return response

    @action(detail=True, methods=['patch'], url_path='apparel-distribution')
    def apparel_distribution(self, request, reference=None):
        from apps.catalog.apparel import ApparelDistributionSerializer, validate_distribution
        quote = self.get_object()
        order = getattr(quote, 'order', None)
        if order and order.status in ['in_production', 'ready', 'delivered', 'cancelled']:
            raise ValidationError('A distribuição não pode ser alterada depois do início da produção.')
        item_id = serializers.IntegerField(min_value=1).run_validation(request.data.get('item_id'))
        item = quote.items.filter(pk=item_id).first()
        if not item or not item.material_briefing.get('apparel'):
            raise ValidationError('Artigo de vestuário indisponível neste pedido.')
        data = ApparelDistributionSerializer(data=request.data.get('apparel'))
        data.is_valid(raise_exception=True)
        validate_distribution({'quantity': item.quantity, 'material_briefing': {'apparel': data.validated_data}})
        item.material_briefing = {**item.material_briefing, 'apparel': data.validated_data}
        item.save(update_fields=['material_briefing', 'updated_at'])
        if order:
            order.items.filter(position=item.position, quantity=item.quantity).update(material_briefing=item.material_briefing)
        record_activity(action='reception_updated', quote=quote, actor=request.user, comment=f'Distribuição de vestuário confirmada/atualizada: {item.description}. Quantidade e condições comerciais mantidas.', is_internal=True)
        return Response({'detail': 'Distribuição guardada. Quantidades e preços não foram alterados.', 'material_briefing': item.material_briefing})

    @action(detail=True, methods=["post"], url_path="set-status")
    @transaction.atomic
    def set_status(self, request, reference=None):
        quote = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        serializer = QuoteStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = quote.status
        new_status = serializer.validated_data["status"]
        if new_status == 'in_production':
            from apps.catalog.apparel import require_apparel_ready
            require_apparel_ready(quote)
        if new_status in {"quoted", "approved", "in_production", "ready", "delivered"}:
            require_sent(quote)
        if not quote.can_transition_to(new_status):
            return Response(
                {
                    "detail": (
                        f"Transição inválida: de '{quote.get_status_display()}' "
                        "não é possível avançar para o estado escolhido."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_fields = ["status", "updated_at"]
        quote.status = new_status
        # Staff can record a client approval given offline (e.g. by phone);
        # stamp the same provenance the client portal would.
        if new_status == QuoteRequest.STATUS_APPROVED and not quote.price_approved_at:
            quote.price_approved_at = timezone.now()
            quote.price_approved_by = request.user
            quote.price_approval_comment = "Aprovação registada pela equipa."
            update_fields += [
                "price_approved_at",
                "price_approved_by",
                "price_approval_comment",
            ]
        quote.save(update_fields=update_fields)
        record_activity(
            action=ActivityEvent.ACTION_STATUS_CHANGED,
            quote=quote,
            actor=request.user,
            from_status=old_status,
            to_status=new_status,
        )
        notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Estado actualizado.",
                "status": new_status,
                "status_display": quote.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="set-price")
    @transaction.atomic
    def set_price(self, request, reference=None):
        quote = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        if quote.commercial_pricing:
            raise ValidationError({'detail': 'Use Preparar proposta para alterar preços, descontos e IVA deste documento.'})
        serializer = QuotePriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prepare(quote, request.user)

        if "estimated_price" in serializer.validated_data:
            quote.estimated_price = serializer.validated_data["estimated_price"]
        if "final_price" in serializer.validated_data:
            quote.final_price = serializer.validated_data["final_price"]
        quote.save(update_fields=["estimated_price", "final_price", "updated_at"])

        old_status = quote.status
        if quote.proposal_stage == "legacy" and quote.final_price and quote.status in (
            QuoteRequest.STATUS_RECEIVED,
            QuoteRequest.STATUS_REVIEWING,
        ):
            quote.status = QuoteRequest.STATUS_QUOTED
            quote.save(update_fields=["status", "updated_at"])
            record_activity(
                action=ActivityEvent.ACTION_STATUS_CHANGED,
                quote=quote,
                actor=request.user,
                from_status=old_status,
                to_status=quote.status,
            )
            notify_quote_ready(quote)
        elif old_status != quote.status:
            notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Preços actualizados.",
                "estimated_price": quote.estimated_price,
                "final_price": quote.final_price,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="upload-proof")
    def upload_proof(self, request, reference=None):
        quote = self.get_object()
        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)

        serializer = ArtworkProofSerializer(artwork, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status=ArtworkApproval.STATUS_PENDING)

        # Keep every uploaded proof as an immutable version.
        if artwork.proof_file:
            ArtworkProofVersion.objects.create(
                quote=quote,
                version=quote.proof_versions.count() + 1,
                file=artwork.proof_file,
                designer_comment=artwork.designer_comment,
                uploaded_by=request.user,
                published_at=timezone.now(),
            )
        record_activity(
            action=ActivityEvent.ACTION_ARTWORK_PROOF_UPLOADED,
            quote=quote,
            actor=request.user,
            comment=artwork.designer_comment,
        )

        old_status = quote.status
        # Artwork publication must not alter commercial acceptance or production state.
        quote.status = old_status
        quote.save(update_fields=["status", "updated_at"])
        if old_status != quote.status:
            record_activity(
                action=ActivityEvent.ACTION_STATUS_CHANGED,
                quote=quote,
                actor=request.user,
                from_status=old_status,
                to_status=quote.status,
            )
        notify_artwork_proof_uploaded(quote)
        if old_status != quote.status:
            notify_quote_status_changed(quote, old_status)

        return Response(
            {
                "detail": "Prova de arte enviada.",
                "artwork": ArtworkApprovalSerializer(artwork).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="approve")
    @transaction.atomic
    def approve(self, request, reference=None):
        quote = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        current_version = quote.proof_versions.filter(published_at__isnull=False).first()
        if current_version and current_version.mime_type and (request.data.get('version_id') != current_version.pk or current_version.client_decision != 'pending'):
            raise ValidationError('A versão da arte mudou ou já recebeu uma decisão. Atualize antes de responder.')
        serializer = QuoteApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)
        artwork.status = ArtworkApproval.STATUS_APPROVED
        artwork.client_comment = serializer.validated_data.get("comment", "")
        artwork.approved_at = timezone.now()
        artwork.save()
        latest_version = quote.proof_versions.filter(published_at__isnull=False).first()
        if latest_version:
            latest_version.client_decision = ArtworkProofVersion.DECISION_APPROVED
            latest_version.client_comment = artwork.client_comment
            latest_version.decision_source = 'staff' if request.user.is_staff else 'branddesk'
            latest_version.reviewer_name = request.user.get_full_name() or request.user.email
            latest_version.save(update_fields=["client_decision", "client_comment", "decision_source", "reviewer_name"])
        record_activity(
            action=ActivityEvent.ACTION_ARTWORK_APPROVED,
            quote=quote,
            actor=request.user,
            comment=artwork.client_comment,
        )

        return Response(
            {
                "detail": "Arte aprovada com sucesso.",
                "artwork": ArtworkApprovalSerializer(artwork).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="request-change")
    @transaction.atomic
    def request_change(self, request, reference=None):
        quote = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        current_version = quote.proof_versions.filter(published_at__isnull=False).first()
        if current_version and current_version.mime_type and (request.data.get('version_id') != current_version.pk or current_version.client_decision != 'pending'):
            raise ValidationError('A versão da arte mudou ou já recebeu uma decisão. Atualize antes de responder.')
        serializer = QuoteChangeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)
        artwork.status = ArtworkApproval.STATUS_CHANGES_REQUESTED
        artwork.requested_changes = serializer.validated_data.get("comment", "")
        artwork.save()
        latest_version = quote.proof_versions.filter(published_at__isnull=False).first()
        if latest_version:
            latest_version.client_decision = ArtworkProofVersion.DECISION_CHANGES_REQUESTED
            latest_version.client_comment = artwork.requested_changes
            latest_version.decision_source = 'staff' if request.user.is_staff else 'branddesk'
            latest_version.reviewer_name = request.user.get_full_name() or request.user.email
            latest_version.save(update_fields=["client_decision", "client_comment", "decision_source", "reviewer_name"])
        record_activity(
            action=ActivityEvent.ACTION_ARTWORK_CHANGES_REQUESTED,
            quote=quote,
            actor=request.user,
            comment=artwork.requested_changes,
        )

        return Response(
            {
                "detail": "Pedido de alteração registado.",
                "artwork": ArtworkApprovalSerializer(artwork).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="approve-price")
    @transaction.atomic
    def approve_price(self, request, reference=None):
        quote = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        require_sent(quote)
        serializer = QuoteApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if quote.status != QuoteRequest.STATUS_QUOTED:
            return Response(
                {"detail": "Apenas orçamentos no estado 'Orçamentado' podem ser aprovados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.price_approved_at = timezone.now()
        quote.price_approved_by = request.user if request.user.is_authenticated else None
        quote.price_approval_comment = serializer.validated_data.get("comment", "")
        quote.save(
            update_fields=[
                "status",
                "price_approved_at",
                "price_approved_by",
                "price_approval_comment",
                "updated_at",
            ]
        )
        record_activity(
            action=ActivityEvent.ACTION_PRICE_APPROVED,
            quote=quote,
            actor=request.user,
            from_status=old_status,
            to_status=quote.status,
            comment=quote.price_approval_comment,
        )
        notify_quote_status_changed(quote, old_status)
        return Response(
            {
                "detail": "Preço aprovado.",
                "status": quote.status,
                "status_display": quote.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="convert-to-order")
    @transaction.atomic
    def convert_to_order(self, request, reference=None):
        quote = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        require_sent(quote)
        if hasattr(quote, "order"):
            return Response(
                {
                    "detail": "Este orçamento já foi convertido numa encomenda.",
                    "order_reference": quote.order.reference,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not quote.price_approved_at:
            return Response(
                {
                    "detail": "O cliente ainda não aprovou o preço deste orçamento. "
                    "Aguarde a aprovação ou registe-a em nome do cliente."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = create_order_from_quote(
            quote,
            delivery_address=getattr(
                getattr(quote.user, "profile", None), "address", ""
            ),
        )

        old_status = quote.status
        quote.status = QuoteRequest.STATUS_APPROVED
        quote.save(update_fields=["status", "updated_at"])

        record_activity(
            action=ActivityEvent.ACTION_CONVERTED_TO_ORDER,
            quote=quote,
            actor=request.user,
            comment=f"Encomenda {order.reference}",
        )
        record_activity(
            action=ActivityEvent.ACTION_CREATED,
            order=order,
            actor=request.user,
            comment=f"Orçamento {quote.reference}",
        )

        notify_quote_status_changed(quote, old_status)
        notify_order_created(order)

        from .serializers import QuoteRequestDetailSerializer

        return Response(
            {
                "detail": "Orçamento convertido em encomenda.",
                "order_reference": order.reference,
                "quote": QuoteRequestDetailSerializer(quote, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
