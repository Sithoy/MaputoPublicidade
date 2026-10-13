from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.accounts.roles import StaffCapability, has_staff_capability
from apps.core.permissions import HasStaffCapability

from .models import Package, Product, ProductCategory, ProductVariant, ServiceCategory
from .serializers import (
    PackageSerializer,
    ProductCategorySerializer,
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
        return [HasStaffCapability(StaffCapability.MANAGE_CATALOG)]


class ProductCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    lookup_field = 'slug'
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def _check_configuration_editor(self, request):
        if any(key not in request.data for key in ['configuration_template', 'configuration_options', 'apparel_options']):
            raise ValidationError('Envie o modelo e as opções completas da categoria.')

    @action(detail=False, methods=['post'], url_path='editor-v2')
    def configuration_editor_create(self, request, *args, **kwargs):
        self._check_configuration_editor(request)
        return self.create(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='editor-v2')
    def configuration_editor_update(self, request, *args, **kwargs):
        self._check_configuration_editor(request)
        return self.partial_update(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [HasStaffCapability(StaffCapability.MANAGE_CATALOG)]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and has_staff_capability(user, StaffCapability.MANAGE_CATALOG):
            return super().get_queryset()
        return super().get_queryset().filter(is_active=True)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = (
        Product.objects.all()
        .select_related("category", "product_category")
        .prefetch_related("variants", "available_services")
        .order_by("-is_featured", "name")
    )
    serializer_class = ProductSerializer
    lookup_field = "slug"
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def _check_category_editor(self, request):
        if any(key not in request.data for key in ['product_category_id', 'configuration_template', 'configuration_options', 'available_service_ids']):
            raise ValidationError('Envie a categoria, o modelo, as opções e os serviços do editor.')

    @action(detail=False, methods=['post'], url_path='editor-v3')
    def inheritance_editor_create(self, request, *args, **kwargs):
        if 'inherit_category_configuration' not in request.data:
            raise ValidationError('Indique se o produto herda a configuração da categoria.')
        return self.category_editor_create(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='editor-v3')
    def inheritance_editor_update(self, request, *args, **kwargs):
        if 'inherit_category_configuration' not in request.data:
            raise ValidationError('Indique se o produto herda a configuração da categoria.')
        return self.category_editor_update(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='editor-v2')
    def category_editor_create(self, request, *args, **kwargs):
        self._check_category_editor(request)
        return self.editor_create(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='editor-v2')
    def category_editor_update(self, request, *args, **kwargs):
        self._check_category_editor(request)
        return self.editor_update(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='editor')
    def editor_create(self, request, *args, **kwargs):
        if 'variant_config' not in request.data:
            raise ValidationError({'variant_config': 'Envie a configuração completa do editor.'})
        return self.create(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='editor')
    def editor_update(self, request, *args, **kwargs):
        if 'variant_config' not in request.data:
            raise ValidationError({'variant_config': 'Envie a configuração completa do editor.'})
        return self.partial_update(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [HasStaffCapability(StaffCapability.MANAGE_CATALOG)]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if not (
            user.is_authenticated
            and user.is_staff
            and has_staff_capability(user, StaffCapability.MANAGE_CATALOG)
        ):
            queryset = queryset.filter(is_active=True)

        category = self.request.query_params.get("category")
        featured = self.request.query_params.get("featured")
        if category:
            queryset = queryset.filter(category__slug=category)
        product_category = self.request.query_params.get('product_category')
        if product_category:
            queryset = queryset.filter(product_category__slug=product_category)
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
        return [HasStaffCapability(StaffCapability.MANAGE_CATALOG)]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not (
            user.is_authenticated
            and user.is_staff
            and has_staff_capability(user, StaffCapability.MANAGE_CATALOG)
        ):
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
        return [HasStaffCapability(StaffCapability.MANAGE_CATALOG)]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if not (
            user.is_authenticated
            and user.is_staff
            and has_staff_capability(user, StaffCapability.MANAGE_CATALOG)
        ):
            queryset = queryset.filter(is_active=True)
        return queryset
