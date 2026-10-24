"""Private in-app notices, generated from the existing workflow events."""

from django.contrib.auth.models import User

from apps.accounts.roles import StaffCapability, has_staff_capability

from .models import PortalNotification


def notify_activity(event):
    target = event.order or event.quote
    if not target:
        return
    kind = "encomendas" if event.order_id else "orcamentos"
    capability = StaffCapability.VIEW_ORDERS if event.order_id else StaffCapability.VIEW_QUOTES
    artwork_decision = event.action in {"artwork_approved", "artwork_changes_requested"}
    if artwork_decision:
        capability = StaffCapability.VIEW_PRODUCTION
    title = f"{target.reference}: {event.get_action_display()}"
    if event.action == "status_changed" and event.to_status:
        title = f"{target.reference}: {target.get_status_display()}"
    notices = []
    # Client decisions notify the responsible team; staff updates notify the owner.
    if not event.actor or not event.actor.is_staff or artwork_decision:
        for staff in User.objects.filter(is_staff=True, is_active=True).select_related("profile"):
            reception = artwork_decision and has_staff_capability(staff, StaffCapability.MANAGE_RECEPTION)
            if (has_staff_capability(staff, capability) or reception) and staff.id != event.actor_id:
                notices.append(PortalNotification(
                    recipient=staff, title=title,
                    href=f'/admin/recepcao?pedido={target.reference}' if reception else '/admin/studio' if event.action == 'artwork_changes_requested' else "/admin/producao" if artwork_decision else f"/admin/{kind}/{target.reference}"
                ))
    if not event.is_internal and target.user_id and target.user_id != event.actor_id:
        if not target.user.is_staff:
            notices.append(PortalNotification(
                recipient=target.user, title=title,
                href=f"/area-cliente/{kind}/{target.reference}",
            ))
    PortalNotification.objects.bulk_create(notices)


def notify_invoice_changed(invoice, actor):
    if invoice.user_id and not invoice.user.is_staff and invoice.user_id != actor.id:
        PortalNotification.objects.create(
            recipient=invoice.user,
            title=f"{invoice.reference}: fatura {invoice.get_status_display().lower()}",
            href=f"/area-cliente/faturas/{invoice.reference}",
        )
