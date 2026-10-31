"""Production gets an explicit technical whitelist, never a commercial serializer."""

import secrets
from datetime import timedelta
from io import BytesIO

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.db.models import Prefetch
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.assets.job_library import reference_data
from apps.quotes.models import (
    ArtworkApproval,
    ArtworkProofFile,
    ArtworkProofVersion,
    QuoteRequest,
    QuoteRequestAttachment,
)

from .activity import record_activity
from .permissions import HasStaffCapability
from .reception_briefing import reception_briefing
from .request_files import reference_response
from .studio import (
    current_proof,
    ensure_studio_editable,
    readiness,
    requirement,
    technical_fingerprint,
)

SALT = "mp-art-review-v1"


def share_token(version):
    return signing.dumps({"id": version.pk, "nonce": version.share_nonce}, salt=SALT)


def public_file_url(version):
    return f"/api/art-review/{share_token(version)}/file/"


def versions(quote):
    return quote.proof_versions.all()


def proof_files(version, base):
    return [
        {"id": 0, "name": version.file_name or version.file.name.rsplit("/", 1)[-1],
         "mime_type": version.mime_type, "url": base},
        *[{"id": row.pk, "name": row.file_name, "mime_type": row.mime_type,
           "url": f"{base}?attachment={row.pk}"} for row in version.attachments.defer("private_content").order_by("pk")],
    ]


def requested_file(version, request):
    attachment = request.query_params.get("attachment")
    if attachment is None:
        return version
    if not attachment.isdigit():
        raise ValidationError("Ficheiro inválido.")
    return get_object_or_404(version.attachments, pk=attachment)


def version_data(version, staff=False):
    data = {
        "id": version.pk,
        "version": version.version,
        "designer_comment": version.designer_comment,
        "file_name": version.file_name or version.file.name.rsplit("/", 1)[-1],
        "mime_type": version.mime_type,
        "published_at": version.published_at,
        "client_decision": version.client_decision,
        "client_comment": version.client_comment,
        "decision_source": version.decision_source,
        "reviewer_name": version.reviewer_name,
    }
    base = f"/api/production/{version.quote.reference}/files/{version.pk}/" if staff else f"/api/artwork-files/{version.pk}/"
    data["files"] = proof_files(version, base)
    if staff:
        data["file_url"] = base
    return data


def job_data(quote):
    order = getattr(quote, "order", None)
    return {
        "reference": quote.reference,
        "client_name": quote.client_company or quote.client_name,
        "status": order.status if order else quote.status,
        "order_reference": order.reference if order else None,
        "scheduled_date": order.scheduled_date if order else None,
        "production_notes": quote.production_notes,
        "briefing": reception_briefing(quote),
        "references": [reference_data(file) for file in quote.request_attachments.all() if not file.is_internal],
        "operation": readiness(quote),
        "items": list(
            quote.items.values(
                "id", "description", "quantity", "size", "material", "colors", "needs_design", "material_briefing", "notes"
            )
        ),
        "artwork_routes": [{'item_id': item.pk, 'requirement': requirement(item)} for item in quote.items.all()],
        "versions": [version_data(version, True) for version in versions(quote)],
    }


def file_response(version):
    if version.mime_type:
        response = FileResponse(
            BytesIO(bytes(version.private_content or b"")), content_type=version.mime_type
        )
    elif version.file:
        response = FileResponse(
            version.file.open("rb"),
            as_attachment=True,
            filename=version.file.name.rsplit("/", 1)[-1],
        )
    else:
        raise ValidationError("Ficheiro indisponível.")
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "sandbox"
    response["Referrer-Policy"] = "no-referrer"
    return response


class ProductionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_field = "reference"

    def get_permissions(self):
        permissions = [HasStaffCapability(StaffCapability.VIEW_PRODUCTION)]
        if self.action in {"technical_notes", "revoke", "requirements", "decision", "email", "studio", "share"}:
            permissions.append(HasStaffCapability(StaffCapability.MANAGE_ARTWORK))
        return permissions

    def get_queryset(self):
        return (
            QuoteRequest.objects.filter(
                status__in=["quoted", "approved", "in_production", "ready", "delivered"]
            )
            .select_related("order")
            .prefetch_related(
                "items",
                Prefetch('request_attachments', queryset=QuoteRequestAttachment.objects.defer('content')),
                Prefetch(
                    "proof_versions", queryset=ArtworkProofVersion.objects.defer("private_content")
                ),
            )
            .order_by("-updated_at", "-pk")
        )

    def list(self, request):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response([job_data(quote) for quote in page])

    def retrieve(self, request, reference=None):
        return Response(job_data(self.get_object()))

    @action(detail=False, methods=['get'])
    def studio(self, request):
        from .studio_queue import studio_agenda

        rows, counts, updated = studio_agenda(self.get_queryset().filter(order__status='approved'))
        task = request.query_params.get('task', 'all')
        if task not in counts:
            raise ValidationError('Filtro de Studio inválido.')
        if task != 'all':
            rows = [row for row in rows if row['followup']] if task == 'followup' else [row for row in rows if row['task'] == task]
        search = request.query_params.get('search', '').strip().casefold()[:160]
        if search:
            rows = [row for row in rows if search in f"{row['reference']} {row['client_name']} {row['description']}".casefold()]
        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(rows, request, view=self)
        response = paginator.get_paginated_response(page)
        response.data.update(overview=counts, updated_at=updated)
        response['Cache-Control'] = 'private, no-store'
        return response

    @action(detail=True, methods=['get'], url_path=r'references/(?P<attachment_id>[0-9]+)')
    def reference_file(self, request, reference=None, attachment_id=None):
        quote = self.get_object()
        file = get_object_or_404(quote.request_attachments, pk=attachment_id, is_internal=False)
        return reference_response(file, request.query_params.get('preview') == '1')

    @action(detail=True, methods=['post'], url_path=r'email/(?P<version_id>[0-9]+)')
    @transaction.atomic
    def email(self, request, reference=None, version_id=None):
        self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(reference=reference)
        ensure_studio_editable(quote)
        version = get_object_or_404(quote.proof_versions, pk=version_id)
        from .studio import prepare_artwork_email
        return Response({'conversation_id': prepare_artwork_email(quote, version, request.user), 'detail': 'Email com arte e link preparado. A Recepção deve rever e enviar por atendimento.'})

    @action(detail=True, methods=['post'], url_path='requirements')
    @transaction.atomic
    def requirements(self, request, reference=None):
        self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(reference=reference)
        ensure_studio_editable(quote)
        note = serializers.CharField(max_length=1000).run_validation(request.data.get('note'))
        rows = request.data.get('items')
        if not isinstance(rows, list) or not rows or len(rows) > 50:
            raise ValidationError('Confirme os requisitos dos artigos deste trabalho.')
        existing = {item.pk: item for item in quote.items.all()}
        seen = set()
        for row in rows:
            if not isinstance(row, dict) or set(row) != {'item_id', 'requirement'}:
                raise ValidationError('Indique apenas o artigo e o requisito de arte.')
            item_id = serializers.IntegerField(min_value=1).run_validation(row['item_id'])
            if item_id not in existing or item_id in seen:
                raise ValidationError('Artigo inválido ou repetido.')
            seen.add(item_id)
            value = serializers.ChoiceField(choices=['none', 'client', 'studio']).run_validation(row['requirement'])
            existing[item_id].artwork_requirement = value
            existing[item_id].save(update_fields=['artwork_requirement'])
        record_activity(action='status_changed', quote=quote, actor=request.user, is_internal=True,
            comment=f'Studio: requisitos de arte confirmados. {note}')
        return Response(job_data(quote))

    @action(detail=True, methods=['post'], url_path='decision')
    @transaction.atomic
    def decision(self, request, reference=None):
        self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(reference=reference)
        ensure_studio_editable(quote)
        version = get_object_or_404(quote.proof_versions, pk=serializers.IntegerField(min_value=1).run_validation(request.data.get('version_id')))
        if request.data.get('confirmed') is not True or not version.published_at or version.client_decision != 'pending' or not current_proof(quote, version):
            raise ValidationError('Confirme uma decisão para a versão atual publicada e ainda pendente.')
        decision = serializers.ChoiceField(choices=['approved', 'changes_requested']).run_validation(request.data.get('decision'))
        contact = serializers.CharField(max_length=160).run_validation(request.data.get('contact_name'))
        comment = serializers.CharField(max_length=3000).run_validation(request.data.get('comment'))
        version.client_decision, version.client_comment = decision, comment
        version.decision_source, version.reviewer_name = 'phone', contact
        version.save(update_fields=['client_decision', 'client_comment', 'decision_source', 'reviewer_name'])
        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)
        artwork.status, artwork.client_comment = decision, comment
        artwork.approved_at = timezone.now() if decision == 'approved' else None
        artwork.requested_changes = comment if decision == 'changes_requested' else ''
        artwork.save()
        record_activity(action='artwork_approved' if decision == 'approved' else 'artwork_changes_requested',
            quote=quote, actor=request.user, comment=f'Arte v{version.version}; decisão por telefone de {contact}. {comment}')
        return Response(job_data(quote))

    @action(detail=True, methods=["post"], url_path="technical-notes")
    def technical_notes(self, request, reference=None):
        quote = self.get_object()
        quote.production_notes = serializers.CharField(
            max_length=5000, allow_blank=True
        ).run_validation(request.data.get("notes", ""))
        quote.save(update_fields=["production_notes", "updated_at"])
        return Response(job_data(quote))

    @action(detail=True, methods=["post"], url_path="artwork")
    @transaction.atomic
    def artwork(self, request, reference=None):
        self.get_object()
        if not HasStaffCapability(StaffCapability.MANAGE_ARTWORK).has_permission(request, self):
            self.permission_denied(request)
        quote = QuoteRequest.objects.select_for_update().get(reference=reference)
        ensure_studio_editable(quote)
        files = request.FILES.getlist("files") or request.FILES.getlist("file")
        if not 1 <= len(files) <= 5:
            raise ValidationError("Selecione entre 1 e 5 ficheiros para esta versão.")
        prepared = []
        for file in files:
            if not file.size or file.size > 5 * 1024 * 1024:
                raise ValidationError("Cada ficheiro deve ter conteúdo e até 5 MB.")
            content = file.read(5 * 1024 * 1024 + 1)
            if not content or len(content) > 5 * 1024 * 1024:
                raise ValidationError("Cada ficheiro deve ter conteúdo e até 5 MB.")
            mime = (
                "application/pdf" if content.startswith(b"%PDF-")
                else "image/png" if content.startswith(b"\x89PNG\r\n\x1a\n")
                else "image/jpeg" if content.startswith(b"\xff\xd8\xff")
                else "image/webp" if content.startswith(b"RIFF") and content[8:12] == b"WEBP"
                else ""
            )
            name = file.name.replace("\\", "/").rsplit("/", 1)[-1][:160]
            if not mime or not name or any(ord(char) < 32 for char in name):
                raise ValidationError("Utilize PDF, PNG, JPEG ou WebP com nome válido.")
            prepared.append((name, mime, content))
        name, mime, content = prepared[0]
        comment = serializers.CharField(max_length=3000, allow_blank=True).run_validation(
            request.data.get("comment", "")
        )
        latest = quote.proof_versions.order_by("-version").first()
        version = ArtworkProofVersion.objects.create(
            quote=quote,
            version=latest.version + 1 if latest else 1,
            private_content=content,
            file_name=name,
            mime_type=mime,
            designer_comment=comment,
            uploaded_by=request.user,
            technical_fingerprint=technical_fingerprint(quote),
        )
        ArtworkProofFile.objects.bulk_create([
            ArtworkProofFile(proof=version, file_name=name, mime_type=mime, private_content=content)
            for name, mime, content in prepared[1:]
        ])
        record_activity(
            action="artwork_proof_uploaded",
            quote=quote,
            actor=request.user,
            comment=f"Arte v{version.version} guardada como rascunho técnico.",
            is_internal=True,
        )
        return Response(job_data(quote), status=201)

    @action(detail=True, methods=["get"], url_path=r"files/(?P<version_id>[0-9]+)")
    def file(self, request, reference=None, version_id=None):
        quote = self.get_object()
        return file_response(requested_file(get_object_or_404(quote.proof_versions, pk=version_id), request))

    @action(detail=True, methods=["post"], url_path=r"publish/(?P<version_id>[0-9]+)")
    @transaction.atomic
    def publish(self, request, reference=None, version_id=None):
        self.get_object()
        if not HasStaffCapability(StaffCapability.MANAGE_ARTWORK).has_permission(request, self):
            self.permission_denied(request)
        quote = QuoteRequest.objects.select_for_update().get(reference=reference)
        ensure_studio_editable(quote)
        version = get_object_or_404(quote.proof_versions, pk=version_id)
        if version.pk != quote.proof_versions.order_by("-version").first().pk:
            raise ValidationError("Publique apenas a versão técnica mais recente.")
        if not current_proof(quote, version):
            raise ValidationError('Os requisitos técnicos mudaram. Prepare uma nova versão de arte.')
        first = version.published_at is None
        version.published_at = version.published_at or timezone.now()
        version.share_nonce = secrets.token_urlsafe(32)
        version.share_expires_at = timezone.now() + timedelta(days=7)
        version.save(update_fields=["published_at", "share_nonce", "share_expires_at"])
        if first:
            artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)
            artwork.status = "pending"
            artwork.designer_comment = version.designer_comment
            artwork.proof_file = version.file
            artwork.client_comment = artwork.requested_changes = ""
            artwork.approved_at = None
            artwork.save()
            record_activity(
                action="artwork_proof_uploaded",
                quote=quote,
                actor=request.user,
                comment=f"Arte v{version.version} submetida para apreciação do cliente.",
            )
        token = share_token(version)
        return Response(
            {
                "job": job_data(quote),
                "review_path": f"/arte/rever/{token}",
                "client_email": quote.client_email,
                "client_phone": quote.client_phone,
                "expires_at": version.share_expires_at,
            }
        )

    @action(detail=True, methods=["post"], url_path=r"revoke/(?P<version_id>[0-9]+)")
    @transaction.atomic
    def revoke(self, request, reference=None, version_id=None):
        quote = self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        version = get_object_or_404(quote.proof_versions, pk=version_id)
        version.share_nonce = ""
        version.share_expires_at = None
        version.save(update_fields=["share_nonce", "share_expires_at"])
        return Response(job_data(quote))

    @action(detail=True, methods=['post'], url_path=r'share/(?P<version_id>[0-9]+)')
    @transaction.atomic
    def share(self, request, reference=None, version_id=None):
        from .review_sharing import share_data

        self.get_object()
        quote = QuoteRequest.objects.select_for_update().get(reference=reference)
        ensure_studio_editable(quote)
        version = get_object_or_404(quote.proof_versions, pk=version_id)
        if not version.published_at or version.client_decision != 'pending' or not current_proof(quote, version):
            raise ValidationError('Publique a versão atual e sem decisão antes de preparar a mensagem.')
        renew = serializers.BooleanField().run_validation(request.data.get('renew', False))
        expired = not version.share_nonce or not version.share_expires_at or version.share_expires_at <= timezone.now()
        if expired and not renew:
            return Response({'expired': True, 'detail': 'Este link expirou ou foi revogado. Gere um novo link antes de enviar.'}, headers={'Cache-Control': 'private, no-store'})
        if renew:
            version.share_nonce = secrets.token_urlsafe(32)
            version.share_expires_at = timezone.now() + timedelta(days=7)
            version.save(update_fields=['share_nonce', 'share_expires_at'])
            record_activity(action='reception_updated', quote=quote, actor=request.user, is_internal=True,
                            comment=f'Link de arte v{version.version} renovado; os links anteriores foram invalidados.')
        link = f"{getattr(settings, 'TRACKING_SITE_URL', 'https://maputopublicidade.com').rstrip('/')}/arte/rever/{share_token(version)}"
        return Response(share_data(quote, version.version, link, version.share_expires_at, 'artwork'),
                        headers={'Cache-Control': 'private, no-store'})


class ReviewThrottle(AnonRateThrottle):
    rate = "30/min"
    scope = "art_review"


class PublicArtReview(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ReviewThrottle]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'private, no-store'
        response['Referrer-Policy'] = 'no-referrer'
        return response

    def version(self, token, allow_expired=False):
        try:
            if len(token) > 1024:
                raise ValueError()
            data = signing.loads(token, salt=SALT, max_age=(90 if allow_expired else 7) * 86400)
            version = get_object_or_404(
                ArtworkProofVersion.objects.select_related("quote").defer("private_content"),
                pk=data["id"],
                share_nonce=data["nonce"],
                published_at__isnull=False,
            )
            if not version.share_nonce or not version.share_expires_at or (not allow_expired and version.share_expires_at <= timezone.now()):
                raise signing.BadSignature()
            return version
        except (signing.BadSignature, KeyError, TypeError, ValueError):
            from django.http import Http404

            raise Http404() from None

    def get(self, request, token, file=False):
        from django.http import Http404
        try:
            version = self.version(token)
        except Http404:
            if not file:
                try:
                    expired = self.version(token, allow_expired=True)
                    if expired.client_decision == 'pending' and current_proof(expired.quote, expired):
                        ensure_studio_editable(expired.quote)
                        return Response({'detail': 'Este link expirou. Peça um novo link à Recepção.', 'code': 'link_expired'}, status=410)
                except (Http404, ValidationError):
                    pass
            raise
        if file:
            return file_response(requested_file(version, request))
        latest = (
            version.quote.proof_versions.filter(published_at__isnull=False)
            .order_by("-version")
            .first()
        )
        response = Response(
            {
                **version_data(version),
                "reference": version.quote.reference,
                "file_url": public_file_url(version),
                "files": proof_files(version, public_file_url(version)),
                "current": latest.pk == version.pk and current_proof(version.quote, version),
            }
        )
        response["Cache-Control"] = "private, no-store"
        response["Referrer-Policy"] = "no-referrer"
        return response

    @transaction.atomic
    def post(self, request, token, file=False):
        if file:
            return Response(status=405)
        if request.data.get('action') == 'request_link':
            from .review_sharing import request_review_link
            version = self.version(token, allow_expired=True)
            quote = QuoteRequest.objects.select_for_update().get(pk=version.quote_id)
            version = self.version(token, allow_expired=True)
            ensure_studio_editable(quote)
            if version.client_decision != 'pending' or not current_proof(quote, version):
                raise ValidationError('Esta versão foi substituída ou já tem uma decisão. Contacte a Recepção.')
            return Response(request_review_link(quote, 'arte', version.version))
        version = self.version(token)
        quote = QuoteRequest.objects.select_for_update().get(pk=version.quote_id)
        ensure_studio_editable(quote)
        version = ArtworkProofVersion.objects.select_for_update().get(pk=version.pk)
        self.version(token)  # Re-check revocation and expiry after acquiring the quote lock.
        latest = (
            quote.proof_versions.filter(published_at__isnull=False).order_by("-version").first()
        )
        if latest.pk != version.pk or version.client_decision != "pending" or not current_proof(quote, version):
            raise ValidationError(
                "Esta versão já recebeu uma decisão ou foi substituída. Peça a versão atual à MP."
            )
        decision = serializers.ChoiceField(
            choices=["approved", "changes_requested"]
        ).run_validation(request.data.get("decision"))
        name = serializers.CharField(max_length=160).run_validation(request.data.get("name"))
        comment = serializers.CharField(
            max_length=3000, allow_blank=decision == "approved"
        ).run_validation(request.data.get("comment", ""))
        version.client_decision, version.client_comment = decision, comment
        version.decision_source, version.reviewer_name = "shared_link", name
        version.save(
            update_fields=["client_decision", "client_comment", "decision_source", "reviewer_name"]
        )
        artwork, _ = ArtworkApproval.objects.get_or_create(quote=quote)
        artwork.status = decision
        artwork.client_comment = comment
        artwork.requested_changes = comment if decision == "changes_requested" else ""
        artwork.approved_at = timezone.now() if decision == "approved" else None
        artwork.save()
        record_activity(
            action="artwork_approved" if decision == "approved" else "artwork_changes_requested",
            quote=quote,
            comment=f"Arte v{version.version}; resposta por link partilhado, nome declarado: {name}. {comment}",
        )
        return Response(
            {
                "detail": "Decisão da arte registada. Esta decisão não aprova preços nem altera pagamentos."
            }
        )


class AuthenticatedArtFile(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, version_id):
        version = get_object_or_404(
            ArtworkProofVersion.objects.select_related("quote").defer("private_content"),
            pk=version_id,
        )
        user = request.user
        if user.is_staff:
            allowed = has_staff_capability(
                user, StaffCapability.VIEW_PRODUCTION
            ) or has_staff_capability(user, StaffCapability.VIEW_QUOTES)
            if (
                not has_staff_capability(user, StaffCapability.VIEW_PRODUCTION)
                and not version.published_at
            ):
                allowed = False
        else:
            allowed = version.quote.user_id == user.pk and version.published_at is not None
        if not allowed:
            from django.http import Http404

            raise Http404()
        return file_response(requested_file(version, request))
