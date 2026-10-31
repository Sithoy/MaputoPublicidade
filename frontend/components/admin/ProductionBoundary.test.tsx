import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductionBoundary } from './ProductionBoundary';
import { getOrder } from '@/lib/admin-api';
import type { Order } from '@/lib/api';

const replace = vi.fn();
const user = { role: 'production', is_staff: true, capabilities: ['orders.view', 'production.view', 'quotes.artwork', 'orders.manage_delivery'] };
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/encomendas/ORD-1', useRouter: () => ({ replace }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, user }) }));
vi.mock('@/lib/admin-api', () => ({ getOrder: vi.fn() }));
vi.mock('./ProductionWorkspace', () => ({ ProductionWorkspace: () => <p>Produção</p> }));
describe('Old order links', () => {
  it('preserves the selected order when opening the dedicated delivery workspace', async () => {
    vi.mocked(getOrder).mockResolvedValue({ reference: 'ORD-1', quote_reference: 'MP-1', status: 'ready' } as Order);
    render(<ProductionBoundary><p>Legacy financial detail</p></ProductionBoundary>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/entregas?encomenda=ORD-1'));
    expect(screen.queryByText('Legacy financial detail')).not.toBeInTheDocument();
    expect(getOrder).toHaveBeenCalledWith('ORD-1');
  });
});
