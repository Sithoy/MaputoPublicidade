import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { getOrder, updateOrderDelivery } from '@/lib/admin-api';
import type { Order } from '@/lib/api';
import { OperationalDelivery } from './OperationalDelivery';

vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ can: () => true }) }));
vi.mock('@/lib/admin-api', () => ({ getOrder: vi.fn(), updateOrderDelivery: vi.fn() }));
it('schedules in Maputo time through the existing order delivery endpoint', async () => {
  const order = { reference: 'ORD-1', status: 'ready', delivery_method: 'pickup', scheduled_date: null } as Order;
  vi.mocked(getOrder).mockResolvedValue(order);
  vi.mocked(updateOrderDelivery).mockResolvedValue(order);
  render(<OperationalDelivery reference="ORD-1" />);
  fireEvent.change(await screen.findByLabelText('Data e hora · Maputo'), { target: { value: '2026-11-02T10:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar entrega' }));
  await waitFor(() => expect(updateOrderDelivery).toHaveBeenCalledWith('ORD-1', expect.objectContaining({ scheduled_date: '2026-11-02T08:30:00.000Z' })));
});

it('keeps the Reception summary read-only even for a manager', async () => {
  vi.mocked(getOrder).mockResolvedValue({ reference: 'ORD-2', status: 'ready', delivery_method: 'pickup' } as Order);
  render(<OperationalDelivery reference="ORD-2" readOnly />);
  expect(await screen.findByLabelText('Data e hora · Maputo')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Guardar entrega' })).not.toBeInTheDocument();
});
