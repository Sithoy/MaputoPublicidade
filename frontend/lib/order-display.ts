import type { Order } from './api';

export function getOrderLabel(order: Order): string {
  const items = order.items ?? [];
  if (items.length === 1) return items[0].description;
  if (items.length > 1) return `${items[0].description} +${items.length - 1}`;
  if (order.item_count === 1) return '1 item solicitado';
  if (order.item_count && order.item_count > 1) return `${order.item_count} itens solicitados`;
  return 'Projeto de marca';
}

export function getOrderHistoryDate(order: Order): string {
  return order.client_confirmed_at || order.updated_at || order.scheduled_date || order.created_at;
}
