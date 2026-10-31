from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.assets.artwork_library import SaveApprovedArtwork

from .email_connection import EmailSettingsView, EmailTestView
from .notification_views import PortalNotificationViewSet
from .observability import MonitoringReport
from .production_views import AuthenticatedArtFile, ProductionViewSet, PublicArtReview
from .reception_views import ReceptionViewSet
from .signatures import StaffSignatures
from .support_views import SupportConversationViewSet
from .tracking_views import TrackingDetail, TrackingLookup, TrackingMessages
from .traffic import CollectTraffic, TrafficReport
from .whatsapp_views import (
    WhatsAppSettingsView,
    WhatsAppTestView,
    WhatsAppVerifyTokenView,
    WhatsAppWebhookView,
)
from .zoho_oauth import (
    ZohoActivate,
    ZohoOAuthCallback,
    ZohoOAuthSettings,
    ZohoOAuthStart,
    ZohoOAuthTest,
    ZohoSendTest,
    ZohoSync,
)

router = DefaultRouter()
router.register("notifications", PortalNotificationViewSet, basename="notification")
router.register(
    "support-conversations", SupportConversationViewSet, basename="support-conversation"
)
router.register("reception", ReceptionViewSet, basename="reception")
router.register("production", ProductionViewSet, basename="production")
urlpatterns = [
    path('observability/report/', MonitoringReport.as_view(), name='observability-report'),
    path('website-traffic/events/', CollectTraffic.as_view(), name='traffic-collect'),
    path('website-traffic/report/', TrafficReport.as_view(), name='traffic-report'),
    path('staff-email-signatures/', StaffSignatures.as_view(), name='staff-email-signatures'),
    path("integrations/email/oauth/activate/", ZohoActivate.as_view(), name="zoho-activate"),
    path("integrations/email/oauth/sync/", ZohoSync.as_view(), name="zoho-sync"),
    path("integrations/email/oauth/send-test/", ZohoSendTest.as_view(), name="zoho-send-test"),
    path("integrations/email/oauth/", ZohoOAuthSettings.as_view(), name="zoho-oauth-settings"),
    path("integrations/email/oauth/start/", ZohoOAuthStart.as_view(), name="zoho-oauth-start"),
    path("integrations/email/oauth/callback/", ZohoOAuthCallback.as_view(), name="zoho-oauth-callback"),
    path("integrations/email/oauth/test/", ZohoOAuthTest.as_view(), name="zoho-oauth-test"),
    path("integrations/email/", EmailSettingsView.as_view(), name="email-settings"),
    path("integrations/email/test/", EmailTestView.as_view(), name="email-test"),
    path("tracking/lookup/", TrackingLookup.as_view(), name="tracking-lookup"),
    path("tracking/detail/", TrackingDetail.as_view(), name="tracking-detail"),
    path("tracking/messages/", TrackingMessages.as_view(), name="tracking-messages"),
    path("artwork-files/<int:version_id>/", AuthenticatedArtFile.as_view(), name="authenticated-art-file"),
    path('artwork-files/<int:version_id>/save-to-library/', SaveApprovedArtwork.as_view(), name='save-approved-artwork'),
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
