from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClientOptionsView, MeView, UserManagementViewSet

router = DefaultRouter()
router.register(r"users", UserManagementViewSet, basename="user")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("client-options/", ClientOptionsView.as_view(), name="client-options"),
    path("", include(router.urls)),
]
