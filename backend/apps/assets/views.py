from rest_framework import mixins, viewsets
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
    queryset = BrandAsset.objects.select_related("user", "uploaded_by")

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
