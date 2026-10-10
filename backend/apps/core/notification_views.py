from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.roles import StaffCapability, has_staff_capability

from .models import PortalNotification


class PortalNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalNotification
        fields = ["id", "title", "href", "read_at", "created_at"]
        read_only_fields = fields


class PortalNotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortalNotificationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = PortalNotification.objects.filter(recipient=user)
        if user.is_staff:
            allowed = Q(pk__in=[])
            for capability, path in (
                (StaffCapability.MANAGE_SUPPORT, "/admin/apoio"),
                (StaffCapability.VIEW_QUOTES, "/admin/orcamentos/"),
                (StaffCapability.VIEW_ORDERS, "/admin/encomendas/"),
            ):
                if has_staff_capability(user, capability):
                    allowed |= Q(href__startswith=path)
            return queryset.filter(allowed)
        return queryset.filter(Q(href="/area-cliente") | Q(href__startswith="/area-cliente/"))

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(read_at__isnull=True).count()})

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notice = self.get_object()
        if notice.read_at is None:
            notice.read_at = timezone.now()
            notice.save(update_fields=["read_at"])
        return Response(self.get_serializer(notice).data)

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({"detail": "Notificações marcadas como lidas."})
