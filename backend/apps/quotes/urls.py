from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .client_proposal import PublicProposalReview
from .views import QuoteRequestViewSet

router = DefaultRouter()
router.register(r"quotes", QuoteRequestViewSet, basename="quote")

urlpatterns = [
    path('proposal-review/', PublicProposalReview.as_view(), name='proposal-review'),
    path("", include(router.urls)),
]
