from django.urls import path
from rest_framework.routers import DefaultRouter

from .notification_views import PortalNotificationViewSet
from .production_views import AuthenticatedArtFile, ProductionViewSet, PublicArtReview
from .reception_views import ReceptionViewSet
from .support_views import SupportConversationViewSet
from .tracking_views import TrackingDetail, TrackingLookup, TrackingMessages
from .whatsapp_views import (
    WhatsAppSettingsView,
    WhatsAppTestView,
    WhatsAppVerifyTokenView,
    WhatsAppWebhookView,
)

router = DefaultRouter()
router.register("notifications", PortalNotificationViewSet, basename="notification")
router.register(
    "support-conversations", SupportConversationViewSet, basename="support-conversation"
)
router.register("reception", ReceptionViewSet, basename="reception")
router.register("production", ProductionViewSet, basename="production")
urlpatterns = [
    path("tracking/lookup/", TrackingLookup.as_view(), name="tracking-lookup"),
    path("tracking/detail/", TrackingDetail.as_view(), name="tracking-detail"),
    path("tracking/messages/", TrackingMessages.as_view(), name="tracking-messages"),
    path("artwork-files/<int:version_id>/", AuthenticatedArtFile.as_view(), name="authenticated-art-file"),
    path("art-review/<str:token>/", PublicArtReview.as_view(), name="public-art-review"),
    path("art-review/<str:token>/file/", PublicArtReview.as_view(), {"file": True}, name="public-art-file"),
    path("integrations/whatsapp/", WhatsAppSettingsView.as_view(), name="whatsapp-settings"),
    path("integrations/whatsapp/test/", WhatsAppTestView.as_view(), name="whatsapp-test"),
    path(
        "integrations/whatsapp/verify-token/",
        WhatsAppVerifyTokenView.as_view(),
        name="whatsapp-verify-token",
    ),
    path("integrations/whatsapp/webhook/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
] + router.urls
