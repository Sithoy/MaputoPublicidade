"""Database-backed edit leases; viewing a request never acquires a lease."""
from datetime import timedelta
from secrets import compare_digest
from uuid import uuid4

from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.accounts.roles import StaffRole, get_staff_role

from .activity import record_activity
from .models import ReceptionEditLease

TTL = timedelta(minutes=5)


class EditConflict(APIException):
    status_code = 409
    default_detail = "Este pedido está em edição. Atualize e retome quando estiver disponível."


def lease_state(quote):
    lease = getattr(quote, "reception_edit_lease", None)
    if not lease or lease.expires_at <= timezone.now():
        return None
    return {"editor_id": lease.editor_id, "editor_name": lease.editor.get_full_name() or lease.editor.username,
            "expires_at": lease.expires_at}


def matches(lease, request):
    token = request.headers.get("X-Reception-Edit-Token", "")
    return lease.editor_id == request.user.pk and bool(token) and compare_digest(str(lease.token), token)


def require_edit(quote, request, required=True):
    # Caller must hold the quote row lock until the business mutation commits.
    lease = ReceptionEditLease.objects.filter(quote=quote, expires_at__gt=timezone.now()).first()
    if lease and not matches(lease, request):
        raise EditConflict("Outra sessão está a editar este pedido. Consulte-o sem alterar os dados.")
    if not lease and required:
        raise EditConflict("A reserva de edição terminou. Atualize o pedido e escolha Iniciar edição.")


def protect_staff_write(quote, request):
    if request.user.is_staff:
        require_edit(quote, request, required=get_staff_role(request.user) == StaffRole.RECEPTIONIST)


def acquire(quote, request, takeover_reason=""):
    now = timezone.now()
    lease = ReceptionEditLease.objects.filter(quote=quote).first()
    if lease and lease.expires_at > now:
        if matches(lease, request):
            lease.expires_at = now + TTL
            lease.save(update_fields=["expires_at"])
            return lease
        if not takeover_reason:
            raise EditConflict("Outra sessão está a editar este pedido.")
    previous = lease.editor.get_full_name() or lease.editor.username if lease else ""
    lease, _ = ReceptionEditLease.objects.update_or_create(quote=quote, defaults={
        "editor": request.user, "token": uuid4(), "expires_at": now + TTL,
    })
    if quote.status == "received" and not quote.reception_completed_at and not quote.proposal_prepared_by_id:
        quote.status = "reviewing"
        quote.save(update_fields=["status", "updated_at"])
    record_activity(action="reception_claimed", actor=request.user, quote=quote, is_internal=True,
                    comment="Reserva temporária de edição iniciada." +
                    (f" Sessão anterior de {previous}." if previous else "") +
                    (f" Retomada autorizada: {takeover_reason}" if takeover_reason else ""))
    return lease
