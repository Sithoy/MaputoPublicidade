from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasAnyStaffCapability, HasStaffCapability

from .roles import (
    StaffCapability,
    StaffRole,
    get_staff_role,
    has_staff_capability,
)
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

    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.MANAGE_USERS)]

    def get_queryset(self):
        queryset = super().get_queryset()
        is_staff = self.request.query_params.get("is_staff")
        is_active = self.request.query_params.get("is_active")
        role = self.request.query_params.get("role")
        if is_staff is not None:
            queryset = queryset.filter(is_staff=is_staff.lower() in ("1", "true", "yes"))
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ("1", "true", "yes"))
        if role == StaffRole.OWNER:
            queryset = queryset.filter(is_superuser=True)
        elif role == StaffRole.CLIENT:
            queryset = queryset.filter(is_staff=False)
        elif role in {choice[0] for choice in StaffRole.assignable_choices()}:
            queryset = queryset.filter(is_staff=True, profile__staff_role=role)
        return queryset

    def _actor_can_manage_staff(self):
        return has_staff_capability(
            self.request.user, StaffCapability.MANAGE_STAFF
        )

    def _validate_account_change(
        self,
        user,
        *,
        desired_staff=None,
        desired_active=None,
        desired_staff_role=None,
    ):
        actor = self.request.user

        if user.is_superuser and not self._actor_can_manage_staff():
            raise PermissionDenied("Apenas o proprietário pode gerir esta conta.")

        if desired_staff is not None and desired_staff != user.is_staff:
            if not self._actor_can_manage_staff():
                raise PermissionDenied(
                    "Apenas o proprietário pode alterar funções da equipa."
                )
            if user == actor and not desired_staff:
                raise ValidationError(
                    {"is_staff": "Não pode remover o seu próprio acesso administrativo."}
                )
            if user.is_superuser and not desired_staff:
                raise ValidationError(
                    {"is_staff": "O proprietário deve manter acesso administrativo."}
                )

        current_staff_role = getattr(
            getattr(user, "profile", None), "staff_role", ""
        )
        if (
            desired_staff_role is not None
            and desired_staff_role != current_staff_role
            and not self._actor_can_manage_staff()
        ):
            raise PermissionDenied(
                "Apenas o proprietário pode alterar funções da equipa."
            )

        if desired_active is not None and desired_active != user.is_active:
            if user == actor and not desired_active:
                raise ValidationError({"is_active": "Não pode desactivar a sua própria conta."})
            if user.is_staff and not self._actor_can_manage_staff():
                raise PermissionDenied(
                    "Apenas o proprietário pode alterar o estado de outro membro da equipa."
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
        if (
            serializer.validated_data.get("is_staff")
            and not self._actor_can_manage_staff()
        ):
            raise PermissionDenied("Apenas o proprietário pode criar membros da equipa.")
        serializer.save()

    def perform_update(self, serializer):
        user = serializer.instance
        actor = self.request.user
        if user.is_staff and user != actor and not self._actor_can_manage_staff():
            raise PermissionDenied("Apenas o proprietário pode gerir membros da equipa.")
        self._validate_account_change(
            user,
            desired_staff=serializer.validated_data.get("is_staff", user.is_staff),
            desired_active=serializer.validated_data.get("is_active", user.is_active),
            desired_staff_role=serializer.validated_data.get(
                "staff_role",
                getattr(getattr(user, "profile", None), "staff_role", ""),
            ),
        )
        serializer.save()

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        users = User.objects.select_related("profile").all()
        user_list = list(users)
        return Response(
            {
                "total": users.count(),
                "active": users.filter(is_active=True).count(),
                "inactive": users.filter(is_active=False).count(),
                "staff": users.filter(is_staff=True).count(),
                "clients": users.filter(is_staff=False).count(),
                "roles": {
                    role: sum(1 for user in user_list if get_staff_role(user) == role)
                    for role, _label in StaffRole.choices
                },
            }
        )

    @action(detail=True, methods=["post"], url_path="toggle-staff")
    def toggle_staff(self, request, pk=None):
        user = self.get_object()
        desired_staff = not user.is_staff
        self._validate_account_change(user, desired_staff=desired_staff)
        user.is_staff = desired_staff
        user.save(update_fields=["is_staff"])
        profile = user.profile
        profile.staff_role = StaffRole.ADMINISTRATOR if desired_staff else ""
        profile.save(update_fields=["staff_role", "updated_at"])
        return Response(
            {
                "detail": "Estado de staff actualizado.",
                "is_staff": user.is_staff,
                "role": get_staff_role(user),
            },
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
        if user.is_staff and user != actor and not self._actor_can_manage_staff():
            raise PermissionDenied(
                "Apenas o proprietário pode redefinir a palavra-passe de outro membro da equipa."
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


class ClientOptionsView(APIView):
    """Compact client directory for commercial and finance document forms."""

    def get_permissions(self):
        return [
            HasAnyStaffCapability(
                StaffCapability.MANAGE_QUOTES,
                StaffCapability.MANAGE_INVOICES,
            )
        ]

    def get(self, request):
        users = (
            User.objects.filter(is_staff=False, is_active=True)
            .select_related("profile")
            .order_by("first_name", "last_name", "email")
        )
        return Response(
            [
                {
                    "id": user.id,
                    "name": user.get_full_name() or user.email,
                    "email": user.email,
                    "company": user.profile.company,
                    "phone": user.profile.phone,
                    "nuit": user.profile.nuit,
                    "address": user.profile.billing_address or user.profile.address,
                }
                for user in users
            ]
        )
