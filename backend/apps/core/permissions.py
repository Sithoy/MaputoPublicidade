from rest_framework import permissions


class IsStaffUser(permissions.BasePermission):
    """Allow access only to authenticated users with is_staff=True."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class IsOwnerOrStaff(permissions.BasePermission):
    """Allow access to staff or to the owner of the object."""

    def __init__(self, owner_field="user"):
        self.owner_field = owner_field

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        owner = getattr(obj, self.owner_field, None)
        return bool(owner and owner == request.user)
