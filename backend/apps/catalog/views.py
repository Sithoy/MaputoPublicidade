from rest_framework import filters, permissions, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.core.permissions import IsStaffUser

from .models import Package, Product, ProductVariant, ServiceCategory
from .serializers import (
    PackageSerializer,
    ProductSerializer,
    ProductVariantSerializer,
    ServiceCategorySerializer,
)


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all().order_by("display_order", "name")
    serializer_class = ServiceCategorySerializer
    lookup_field = "slug"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [IsStaffUser()]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = (
        Product.objects.all()
        .select_related("category")
        .prefetch_related("variants")
        .order_by("-is_featured", "name")
    )
    serializer_class = ProductSerializer
    lookup_field = "slug"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [IsStaffUser()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if not (user.is_authenticated and user.is_staff):
            queryset = queryset.filter(is_active=True)

        category = self.request.query_params.get("category")
        featured = self.request.query_params.get("featured")
        if category:
            queryset = queryset.filter(category__slug=category)
        if featured is not None:
            queryset = queryset.filter(is_featured=featured.lower() in ("1", "true", "yes"))
        return queryset


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all().select_related("product").order_by("position", "name")
    serializer_class = ProductVariantSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [IsStaffUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not (user.is_authenticated and user.is_staff):
            queryset = queryset.filter(is_active=True)
        product_slug = self.request.query_params.get("product")
        if product_slug:
            queryset = queryset.filter(product__slug=product_slug)
        return queryset


class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.all().order_by("-created_at")
    serializer_class = PackageSerializer
    lookup_field = "slug"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [IsStaffUser()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if not (user.is_authenticated and user.is_staff):
            queryset = queryset.filter(is_active=True)
        return queryset
