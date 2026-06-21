from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UserManagementViewSet

router = DefaultRouter()
router.register(r"users", UserManagementViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
]
