from rest_framework import viewsets

from .models import PortfolioItem
from .serializers import PortfolioItemSerializer


class PortfolioItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PortfolioItem.objects.filter(is_active=True).select_related("category")
    serializer_class = PortfolioItemSerializer
    lookup_field = "slug"

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset
