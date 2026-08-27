from rest_framework.routers import DefaultRouter

from .views import BrandAssetViewSet

router = DefaultRouter()
router.register(r"brand-assets", BrandAssetViewSet, basename="brand-asset")

urlpatterns = router.urls
