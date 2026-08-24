from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStaffUser

from .serializers import (
    AdminPasswordResetSerializer,
    UserAdminSerializer,
    UserSerializer,
)


class UserManagementViewSet(viewsets.ModelViewSet):
    """Staff-only user management API."""

    queryset = (
        User.objects.all()
        .select_related("profile")
        .annotate(
            order_count=Count("orders", distinct=True),
            quote_count=Count("quotes", distinct=True),
        )
        .order_by("-date_joined")
    )
    serializer_class = UserAdminSerializer
    permission_classes = [IsStaffUser]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "email",
        "first_name",
        "last_name",
        "profile__company",
        "profile__phone",
    ]
    ordering_fields = ["date_joined", "last_login", "email", "first_name"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        queryset = super().get_queryset()
        is_staff = self.request.query_params.get("is_staff")
        is_active = self.request.query_params.get("is_active")
        if is_staff is not None:
            queryset = queryset.filter(is_staff=is_staff.lower() in ("1", "true", "yes"))
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ("1", "true", "yes"))
        return queryset

    def _validate_account_change(
        self,
        user,
        *,
        desired_staff=None,
        desired_active=None,
    ):
        actor = self.request.user

        if user.is_superuser and not actor.is_superuser:
            raise PermissionDenied("Apenas um superutilizador pode gerir esta conta.")

        if desired_staff is not None and desired_staff != user.is_staff:
            if not actor.is_superuser:
                raise PermissionDenied(
                    "Apenas um superutilizador pode alterar funções administrativas."
                )
            if user == actor and not desired_staff:
                raise ValidationError(
                    {"is_staff": "Não pode remover o seu próprio acesso administrativo."}
                )
            if user.is_superuser and not desired_staff:
                raise ValidationError(
                    {"is_staff": "Um superutilizador deve manter acesso administrativo."}
                )

        if desired_active is not None and desired_active != user.is_active:
            if user == actor and not desired_active:
                raise ValidationError({"is_active": "Não pode desactivar a sua própria conta."})
            if user.is_staff and not actor.is_superuser:
                raise PermissionDenied(
                    "Apenas um superutilizador pode alterar o estado de um administrador."
                )
            if (
                user.is_superuser
                and not desired_active
                and not User.objects.filter(is_superuser=True, is_active=True)
                .exclude(pk=user.pk)
                .exists()
            ):
                raise ValidationError(
                    {"is_active": "Deve existir pelo menos um superutilizador activo."}
                )

    def perform_create(self, serializer):
        if serializer.validated_data.get("is_staff") and not self.request.user.is_superuser:
            raise PermissionDenied("Apenas um superutilizador pode criar administradores.")
        serializer.save()

    def perform_update(self, serializer):
        user = serializer.instance
        actor = self.request.user
        if user.is_staff and user != actor and not actor.is_superuser:
            raise PermissionDenied("Apenas um superutilizador pode gerir administradores.")
        self._validate_account_change(
            user,
            desired_staff=serializer.validated_data.get("is_staff", user.is_staff),
            desired_active=serializer.validated_data.get("is_active", user.is_active),
        )
        serializer.save()

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        users = User.objects.all()
        return Response(
            {
                "total": users.count(),
                "active": users.filter(is_active=True).count(),
                "inactive": users.filter(is_active=False).count(),
                "staff": users.filter(is_staff=True).count(),
                "clients": users.filter(is_staff=False).count(),
            }
        )

    @action(detail=True, methods=["post"], url_path="toggle-staff")
    def toggle_staff(self, request, pk=None):
        user = self.get_object()
        desired_staff = not user.is_staff
        self._validate_account_change(user, desired_staff=desired_staff)
        user.is_staff = desired_staff
        user.save(update_fields=["is_staff"])
        return Response(
            {"detail": "Estado de staff actualizado.", "is_staff": user.is_staff},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        desired_active = not user.is_active
        self._validate_account_change(user, desired_active=desired_active)
        user.is_active = desired_active
        user.save(update_fields=["is_active"])
        return Response(
            {"detail": "Estado de activação actualizado.", "is_active": user.is_active},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="set-password")
    def set_password(self, request, pk=None):
        user = self.get_object()
        actor = request.user
        if user.is_staff and user != actor and not actor.is_superuser:
            raise PermissionDenied(
                "Apenas um superutilizador pode redefinir a palavra-passe de um administrador."
            )
        serializer = AdminPasswordResetSerializer(
            data=request.data,
            context={"user": user},
        )
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response(
            {"detail": "Palavra-passe actualizada com sucesso."},
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """Return/update the authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
