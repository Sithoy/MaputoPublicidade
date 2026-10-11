from django.urls import path
from rest_framework.routers import DefaultRouter

from .notification_views import PortalNotificationViewSet
from .reception_views import ReceptionViewSet
from .support_views import SupportConversationViewSet
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
urlpatterns = [
    path("integrations/whatsapp/", WhatsAppSettingsView.as_view(), name="whatsapp-settings"),
    path("integrations/whatsapp/test/", WhatsAppTestView.as_view(), name="whatsapp-test"),
    path(
        "integrations/whatsapp/verify-token/",
        WhatsAppVerifyTokenView.as_view(),
        name="whatsapp-verify-token",
    ),
    path("integrations/whatsapp/webhook/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
] + router.urls
