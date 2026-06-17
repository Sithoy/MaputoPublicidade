from rest_framework import permissions


class IsStaffUser(permissions.BasePermission):
    """Allow access only to authenticated users with is_staff=True."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )
