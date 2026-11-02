import type { Order } from './api';
import type { StaffCapability } from './rbac';

export function requestWorkspaceHref(reference: string, can: (capability: StaffCapability) => boolean) {
  return can('reception.manage') ? `/admin/recepcao?pedido=${encodeURIComponent(reference)}` : `/admin/orcamentos/${encodeURIComponent(reference)}`;
}

export function orderWorkspaceHref(order: Pick<Order, 'reference' | 'quote_reference' | 'status' | 'artwork_status'>, can: (capability: StaffCapability) => boolean) {
  if (can('orders.manage_delivery') && ['ready', 'delivered'].includes(order.status)) return `/admin/entregas?encomenda=${encodeURIComponent(order.reference)}`;
  if (can('production.view') && order.quote_reference && ['approved', 'in_production'].includes(order.status)) {
    return `/admin/operacoes?pedido=${encodeURIComponent(order.quote_reference)}`;
  }
  if (can('reception.manage') && order.quote_reference) return requestWorkspaceHref(order.quote_reference, can);
  return `/admin/encomendas/${encodeURIComponent(order.reference)}`;
}
