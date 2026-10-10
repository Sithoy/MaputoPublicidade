from rest_framework.routers import DefaultRouter

from .notification_views import PortalNotificationViewSet
from .reception_views import ReceptionViewSet
from .support_views import SupportConversationViewSet

router = DefaultRouter()
router.register("notifications", PortalNotificationViewSet, basename="notification")
router.register("support-conversations", SupportConversationViewSet, basename="support-conversation")
router.register("reception", ReceptionViewSet, basename="reception")
urlpatterns = router.urls
