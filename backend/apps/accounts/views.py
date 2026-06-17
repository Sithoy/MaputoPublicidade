from django.contrib.auth.models import User
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.permissions import IsStaffUser

from .serializers import (
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserAdminSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserManagementViewSet(viewsets.ModelViewSet):
    """Staff-only user management API."""

    queryset = User.objects.all().select_related("profile").order_by("-date_joined")
    serializer_class = UserAdminSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [SearchFilter]
    search_fields = ["email", "first_name", "last_name", "profile__company", "profile__phone"]

    def get_queryset(self):
        queryset = super().get_queryset()
        is_staff = self.request.query_params.get("is_staff")
        is_active = self.request.query_params.get("is_active")
        if is_staff is not None:
            queryset = queryset.filter(is_staff=is_staff.lower() in ("1", "true", "yes"))
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ("1", "true", "yes"))
        return queryset

    @action(detail=True, methods=["post"], url_path="toggle-staff")
    def toggle_staff(self, request, pk=None):
        user = self.get_object()
        user.is_staff = not user.is_staff
        user.save(update_fields=["is_staff"])
        return Response(
            {"detail": "Estado de staff actualizado.", "is_staff": user.is_staff},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response(
            {"detail": "Estado de activação actualizado.", "is_active": user.is_active},
            status=status.HTTP_200_OK,
        )
