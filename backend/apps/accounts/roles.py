from django.db import models


class StaffRole(models.TextChoices):
    OWNER = "owner", "Proprietário"
    ADMINISTRATOR = "administrator", "Administrador"
    COMMERCIAL = "commercial", "Comercial"
    PRODUCTION = "production", "Produção"
    FINANCE = "finance", "Finanças"
    CONTENT = "content", "Conteúdo"
    CLIENT = "client", "Cliente"

    @classmethod
    def assignable_choices(cls):
        return [
            choice
            for choice in cls.choices
            if choice[0] not in {cls.OWNER, cls.CLIENT}
        ]


class StaffCapability:
    VIEW_DASHBOARD = "dashboard.view"
    VIEW_QUOTES = "quotes.view"
    MANAGE_QUOTES = "quotes.manage"
    MANAGE_ARTWORK = "quotes.artwork"
    EXPORT_QUOTES = "quotes.export"
    VIEW_ORDERS = "orders.view"
    MANAGE_ORDERS = "orders.manage"
    MANAGE_ORDER_STATUS = "orders.manage_status"
    EXPORT_ORDERS = "orders.export"
    VIEW_PAYMENTS = "payments.view"
    MANAGE_PAYMENTS = "payments.manage"
    VIEW_INVOICES = "invoices.view"
    MANAGE_INVOICES = "invoices.manage"
    EXPORT_INVOICES = "invoices.export"
    MANAGE_CATALOG = "catalog.manage"
    MANAGE_CONTENT = "content.manage"
    MANAGE_USERS = "users.manage"
    MANAGE_STAFF = "staff.manage"


ALL_STAFF_CAPABILITIES = frozenset(
    value
    for name, value in vars(StaffCapability).items()
    if name.isupper() and isinstance(value, str)
)


ROLE_CAPABILITIES = {
    StaffRole.OWNER: ALL_STAFF_CAPABILITIES,
    StaffRole.ADMINISTRATOR: ALL_STAFF_CAPABILITIES
    - {StaffCapability.MANAGE_STAFF},
    StaffRole.COMMERCIAL: frozenset(
        {
            StaffCapability.VIEW_DASHBOARD,
            StaffCapability.VIEW_QUOTES,
            StaffCapability.MANAGE_QUOTES,
            StaffCapability.MANAGE_ARTWORK,
            StaffCapability.EXPORT_QUOTES,
            StaffCapability.VIEW_ORDERS,
            StaffCapability.MANAGE_ORDERS,
            StaffCapability.EXPORT_ORDERS,
            StaffCapability.VIEW_PAYMENTS,
            StaffCapability.VIEW_INVOICES,
        }
    ),
    StaffRole.PRODUCTION: frozenset(
        {
            StaffCapability.VIEW_QUOTES,
            StaffCapability.MANAGE_ARTWORK,
            StaffCapability.VIEW_ORDERS,
            StaffCapability.MANAGE_ORDER_STATUS,
            StaffCapability.VIEW_PAYMENTS,
        }
    ),
    StaffRole.FINANCE: frozenset(
        {
            StaffCapability.VIEW_DASHBOARD,
            StaffCapability.VIEW_QUOTES,
            StaffCapability.EXPORT_QUOTES,
            StaffCapability.VIEW_ORDERS,
            StaffCapability.EXPORT_ORDERS,
            StaffCapability.VIEW_PAYMENTS,
            StaffCapability.MANAGE_PAYMENTS,
            StaffCapability.VIEW_INVOICES,
            StaffCapability.MANAGE_INVOICES,
            StaffCapability.EXPORT_INVOICES,
        }
    ),
    StaffRole.CONTENT: frozenset(
        {
            StaffCapability.MANAGE_CATALOG,
            StaffCapability.MANAGE_CONTENT,
        }
    ),
    StaffRole.CLIENT: frozenset(),
}


def get_staff_role(user) -> str:
    if not user or not getattr(user, "is_authenticated", False):
        return StaffRole.CLIENT
    if getattr(user, "is_superuser", False):
        return StaffRole.OWNER
    if not getattr(user, "is_staff", False):
        return StaffRole.CLIENT

    profile = getattr(user, "profile", None)
    role = getattr(profile, "staff_role", "")
    assignable_roles = {choice[0] for choice in StaffRole.assignable_choices()}
    # Backwards compatibility for staff created before RBAC was introduced.
    return role if role in assignable_roles else StaffRole.ADMINISTRATOR


def get_staff_capabilities(user) -> frozenset[str]:
    return ROLE_CAPABILITIES.get(get_staff_role(user), frozenset())


def has_staff_capability(user, capability: str) -> bool:
    return capability in get_staff_capabilities(user)


def get_role_display(role: str) -> str:
    return dict(StaffRole.choices).get(role, role)
