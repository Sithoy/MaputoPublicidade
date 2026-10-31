import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeliveryWorkspace } from './DeliveryWorkspace';
import { getOrders, updateOrderStatus } from '@/lib/admin-api';
import type { Order } from '@/lib/api';

let allowed = true;
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => allowed }) }));
vi.mock('@/lib/admin-api', () => ({ getOrders: vi.fn(), updateOrderStatus: vi.fn() }));
vi.mock('./OperationalDelivery', () => ({ OperationalDelivery: () => <div>Agendamento existente</div> }));
const ready = { reference: 'ORD-1', quote_reference: 'MP-1', client_name: 'Empresa A', status: 'ready', job_summary: '200 polos', final_price: 99999, items: [] } as unknown as Order;
beforeEach(() => { allowed = true; vi.clearAllMocks(); vi.mocked(getOrders).mockResolvedValue([ready]); });
describe('Delivery workspace', () => {
  it('shows logistics without prices and opens the existing delivery controls', async () => {
    render(<DeliveryWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir entrega ORD-1' }));
    expect(screen.getByText('Agendamento existente')).toBeInTheDocument();
    expect(screen.queryByText(/99999/)).not.toBeInTheDocument();
    expect(screen.queryByText('Iniciar produção')).not.toBeInTheDocument();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega concluída' }));
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('ORD-1', 'delivered'));
    confirm.mockRestore();
  });
  it('allows planning but cannot complete an order still in production', async () => {
    vi.mocked(getOrders).mockResolvedValue([{ ...ready, status: 'in_production' }]);
    render(<DeliveryWorkspace initialReference="ORD-1" />);
    await screen.findByText('Agendamento existente');
    expect(screen.queryByRole('button', { name: 'Confirmar entrega concluída' })).not.toBeInTheDocument();
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });
  it('does not load data without permission', () => {
    allowed = false;
    render(<DeliveryWorkspace />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(getOrders).not.toHaveBeenCalled();
  });
});
