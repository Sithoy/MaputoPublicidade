import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import RequestRegister from './RequestRegister';
import { getQuotes } from '@/lib/admin-api';
import type { Quote } from '@/lib/api';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => true }) }));
vi.mock('@/lib/admin-api', () => ({ getQuotes: vi.fn(), exportQuotes: vi.fn() }));
it('shows proposals as a filtered view of the same requests and opens Reception', async () => {
  vi.mocked(getQuotes).mockResolvedValue([
    { id: 1, reference: 'MP-1', status: 'received', client_name: 'Novo cliente', created_at: '2026-10-31', item_count: 1 },
    { id: 2, reference: 'MP-2', status: 'quoted', client_name: 'Empresa A', created_at: '2026-10-31', item_count: 1, proposal_workflow: { version: 1 } },
  ] as Quote[]);
  render(<RequestRegister proposalsOnly />);
  await screen.findByText('MP-2');
  expect(screen.queryByText('MP-1')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Abrir na Recepção' })).toHaveAttribute('href', '/admin/recepcao?pedido=MP-2');
  expect(screen.queryByRole('button', { name: 'As minhas propostas' })).not.toBeInTheDocument();
  expect(getQuotes).toHaveBeenCalledWith();
});
