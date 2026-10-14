import mimetypes
from io import BytesIO

from django.http import FileResponse, Http404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsOwnerOrStaff

from .models import BrandAsset
from .serializers import BrandAssetSerializer


class BrandAssetViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Clients manage their own brand materials; staff can see all of them."""

    serializer_class = BrandAssetSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]
    queryset = BrandAsset.objects.select_related("user", "uploaded_by").defer("private_content")

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            user_filter = self.request.query_params.get("user")
            if user_filter:
                queryset = queryset.filter(user_id=user_filter)
            return queryset
        return queryset.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        # Staff may upload on behalf of a client by passing user_id.
        owner = user
        if user.is_staff:
            owner_id = self.request.data.get("user_id")
            if owner_id:
                from django.contrib.auth.models import User

                owner = User.objects.get(id=owner_id, is_staff=False)
        serializer.save(user=owner, uploaded_by=user)

    @action(detail=True, methods=["get"], url_path="file")
    def file(self, request, pk=None):
        asset = self.get_object()
        filename = asset.file_name or asset.file.name.rsplit("/", 1)[-1]
        mime_type = (
            asset.file_mime_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        )
        if asset.private_content is not None:
            source = BytesIO(bytes(asset.private_content))
        else:
            try:
                if not asset.file or not asset.file.storage.exists(asset.file.name):
                    raise Http404("Ficheiro indisponível. Volte a carregar o material.")
                source = asset.file.open("rb")
            except (FileNotFoundError, OSError, ValueError):
                raise Http404("Ficheiro indisponível. Volte a carregar o material.") from None
        response = FileResponse(
            source,
            as_attachment=not mime_type.startswith("image/"),
            filename=filename,
            content_type=mime_type,
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Security-Policy"] = "sandbox"
        response["Referrer-Policy"] = "no-referrer"
        return response
