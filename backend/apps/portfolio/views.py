from rest_framework import permissions, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.core.permissions import IsStaffUser

from .models import PortfolioItem
from .serializers import PortfolioItemSerializer


class PortfolioItemViewSet(viewsets.ModelViewSet):
    queryset = PortfolioItem.objects.all().select_related("category").order_by(
        "-is_featured", "-created_at"
    )
    serializer_class = PortfolioItemSerializer
    lookup_field = "slug"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [IsStaffUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if self.action in ["list", "retrieve"] and not (
            user.is_authenticated and user.is_staff
        ):
            queryset = queryset.filter(is_active=True)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset
