from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PackageViewSet, ProductViewSet, ServiceCategoryViewSet

router = DefaultRouter()
router.register(r"categories", ServiceCategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"packages", PackageViewSet, basename="package")

urlpatterns = [
    path("", include(router.urls)),
]
