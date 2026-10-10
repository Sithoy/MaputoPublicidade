import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createManualQuote } from '@/lib/admin-api';
import NewQuotePage from './page';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => true }) }));
vi.mock('@/lib/admin-api', () => ({
  getClientOptions: vi.fn().mockResolvedValue([{ id: 1, name: 'Ana', company: 'Empresa Horizonte', email: 'ana@example.com', nuit: '400123456' }]),
  getProducts: vi.fn().mockResolvedValue([]), createManualQuote: vi.fn(), prepareProposal: vi.fn(),
}));

describe('Proposal client identity', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses one identity input and snapshots registered company NUIT', async () => {
    vi.mocked(createManualQuote).mockResolvedValue({ reference: 'MP-0001-2026' } as Awaited<ReturnType<typeof createManualQuote>>);
    render(<NewQuotePage />);
    await screen.findByRole('option', { name: 'Ana — Empresa Horizonte' });
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cliente registado'), { target: { value: '1' } });
    expect(screen.getByLabelText('Nome do cliente ou empresa *')).toHaveValue('Empresa Horizonte');
    expect(screen.getByLabelText('NUIT')).toHaveValue('400123456');
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Cartões' } });
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar orçamento' }));
    await waitFor(() => expect(createManualQuote).toHaveBeenCalled());
    expect(vi.mocked(createManualQuote).mock.calls[0][0]).toMatchObject({ client_name: 'Empresa Horizonte', client_company: '', client_nuit: '400123456' });
    expect(push).toHaveBeenCalledWith('/admin/orcamentos/MP-0001-2026');
  });
});
