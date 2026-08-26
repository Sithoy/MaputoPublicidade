from rest_framework import serializers

from .models import ActivityEvent


def record_activity(
    *,
    action: str,
    actor=None,
    quote=None,
    order=None,
    from_status: str = "",
    to_status: str = "",
    comment: str = "",
    is_internal: bool = False,
) -> ActivityEvent:
    return ActivityEvent.objects.create(
        quote=quote,
        order=order,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        from_status=from_status,
        to_status=to_status,
        comment=comment,
        is_internal=is_internal,
    )


class ActivityEventSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "action",
            "action_display",
            "actor_name",
            "from_status",
            "to_status",
            "comment",
            "created_at",
        ]

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        # Clients see a neutral team label; staff see the actual person.
        request = self.context.get("request")
        viewer_is_staff = bool(
            request and request.user.is_authenticated and request.user.is_staff
        )
        if obj.actor.is_staff and not viewer_is_staff:
            return "Equipa MP"
        return obj.actor.get_full_name() or obj.actor.email


def serialize_activity(obj, context):
    """Events for a quote/order detail, hiding internal events from clients."""
    qs = obj.activity_events.all()
    request = context.get("request")
    if not (request and request.user.is_authenticated and request.user.is_staff):
        qs = qs.filter(is_internal=False)
    return ActivityEventSerializer(qs, many=True, context=context).data
