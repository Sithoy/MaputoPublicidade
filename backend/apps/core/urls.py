from rest_framework.routers import DefaultRouter

from .notification_views import PortalNotificationViewSet

router = DefaultRouter()
router.register("notifications", PortalNotificationViewSet, basename="notification")
urlpatterns = router.urls
