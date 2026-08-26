from rest_framework import permissions

from apps.accounts.roles import has_staff_capability


class IsStaffUser(permissions.BasePermission):
    """Allow access only to authenticated users with is_staff=True."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class HasStaffCapability(permissions.BasePermission):
    """Allow staff only when their assigned role grants a capability."""

    message = "A sua função não tem permissão para executar esta acção."

    def __init__(self, capability):
        self.capability = capability

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
            and has_staff_capability(request.user, self.capability)
        )


class HasAnyStaffCapability(permissions.BasePermission):
    """Allow staff when at least one of the supplied capabilities is granted."""

    message = "A sua função não tem permissão para executar esta acção."

    def __init__(self, *capabilities):
        self.capabilities = capabilities

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
            and any(
                has_staff_capability(request.user, capability)
                for capability in self.capabilities
            )
        )


class IsOwnerOrStaff(permissions.BasePermission):
    """Allow access to staff or to the owner of the object."""

    message = "Não tem permissão para aceder a este recurso."

    def __init__(self, owner_field="user", staff_capability=None):
        self.owner_field = owner_field
        self.staff_capability = staff_capability

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff and self.staff_capability:
            return has_staff_capability(request.user, self.staff_capability)
        return True

    def _get_owner(self, obj):
        owner = obj
        for field in self.owner_field.split("."):
            owner = getattr(owner, field, None)
            if owner is None:
                break
        return owner

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return not self.staff_capability or has_staff_capability(
                request.user, self.staff_capability
            )
        owner = self._get_owner(obj)
        return bool(owner and owner == request.user)
