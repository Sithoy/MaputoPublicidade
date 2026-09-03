import { describe, expect, it } from 'vitest';
import type { Order } from './api';
import { getOrderHistoryDate, getOrderLabel } from './order-display';

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    reference: 'MP-0001-2026',
    payment_status: 'paid',
    status: 'delivered',
    items: [],
    created_at: '2026-01-01T08:00:00Z',
    ...overrides,
  };
}

describe('order display helpers', () => {
  it('uses the item description for a single-item order', () => {
    expect(getOrderLabel(order({ items: [{ id: 1, description: 'Polos bordados', quantity: 20 }] }))).toBe('Polos bordados');
  });

  it('summarises orders with several items', () => {
    expect(getOrderLabel(order({ items: [{ id: 1, description: 'Banners', quantity: 2 }, { id: 2, description: 'Flyers', quantity: 500 }] }))).toBe('Banners +1');
  });

  it('falls back to the item count when item details are not included', () => {
    expect(getOrderLabel(order({ item_count: 3 }))).toBe('3 itens solicitados');
  });

  it('prefers the client confirmation date for history ordering', () => {
    expect(getOrderHistoryDate(order({ client_confirmed_at: '2026-02-03T10:30:00Z' }))).toBe('2026-02-03T10:30:00Z');
  });
});
