from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PartnerViewSet, PortfolioItemViewSet

router = DefaultRouter()
router.register(r"portfolio", PortfolioItemViewSet, basename="portfolio")
router.register(r"partners", PartnerViewSet, basename="partner")

urlpatterns = [
    path("", include(router.urls)),
]
