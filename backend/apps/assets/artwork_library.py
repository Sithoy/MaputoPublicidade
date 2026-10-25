"""Archive a verified job approval without granting a new job production approval."""
import hashlib
from uuid import uuid4

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.core.activity import record_activity
from apps.core.studio import current_proof
from apps.quotes.models import ArtworkProofVersion, QuoteRequest

from .models import BrandAsset
from .serializers import BrandAssetSerializer


class SaveApprovedArtwork(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, version_id):
        versions = ArtworkProofVersion.objects.select_related('quote')
        if request.user.is_staff:
            if not all(has_staff_capability(request.user, cap) for cap in (StaffCapability.VIEW_PRODUCTION, StaffCapability.MANAGE_ARTWORK)):
                self.permission_denied(request)
        else:
            versions = versions.filter(quote__user=request.user)
        version = get_object_or_404(versions, pk=version_id)
        quote = QuoteRequest.objects.select_for_update().get(pk=version.quote_id)
        if not request.user.is_staff and quote.user_id != request.user.pk:
            raise NotFound()
        version.refresh_from_db()
        if request.data.get('confirmed') is not True:
            raise ValidationError('Confirme que pretende guardar esta arte na Biblioteca do cliente.')
        if not quote.user_id or quote.user.is_staff:
            raise ValidationError('Associe primeiro o pedido a uma conta de cliente. Não associamos ficheiros apenas pelo email.')
        if not version.published_at or version.client_decision != 'approved' or not current_proof(quote, version):
            raise ValidationError('Guarde apenas a versão atual publicada e aprovada pelo cliente.')
        existing = BrandAsset.objects.filter(source_proof=version).first()
        if existing:
            if existing.user_id != quote.user_id:
                raise ValidationError('Esta arte está associada à conta anterior. Confirme a titularidade com a MP.')
            return Response(BrandAssetSerializer(existing).data)
        name = serializers.CharField(max_length=255).run_validation(request.data.get('name', f'{quote.reference} · Arte v{version.version}'))
        if version.private_content is not None:
            content = bytes(version.private_content)
        else:
            try:
                with version.file.open('rb') as file:
                    content = file.read(5 * 1024 * 1024 + 1)
            except (OSError, ValueError) as exc:
                raise ValidationError('Arte indisponível. Confirme o ficheiro com o Studio.') from exc
        if not content or len(content) > 5 * 1024 * 1024:
            raise ValidationError('A arte deve ter conteúdo e até 5 MB.')
        artwork = getattr(quote, 'artwork', None)
        approval = {'quote_reference': quote.reference, 'version': version.version,
            'source': version.decision_source or 'branddesk', 'reviewer_name': version.reviewer_name,
            'approved_at': artwork.approved_at.isoformat() if artwork and artwork.approved_at else None,
            'comment': version.client_comment, 'sha256': hashlib.sha256(content).hexdigest()}
        asset = BrandAsset.objects.create(user=quote.user, uploaded_by=request.user,
            name=name, kind=BrandAsset.KIND_ARTWORK, source_proof=version, approval_record=approval,
            file=f'private/brand_assets/{uuid4().hex}', private_content=content,
            file_name=version.file_name or version.file.name.rsplit('/', 1)[-1],
            file_mime_type=version.mime_type or 'application/octet-stream', file_size=len(content),
            description=f'Arte aprovada para {quote.reference}, versão {version.version}. Novas aplicações requerem confirmação no respetivo pedido.')
        record_activity(action='reception_updated', quote=quote, actor=request.user,
            comment=f'Arte aprovada v{version.version} guardada na Biblioteca da marca para reutilização.')
        return Response(BrandAssetSerializer(asset).data, status=201)
