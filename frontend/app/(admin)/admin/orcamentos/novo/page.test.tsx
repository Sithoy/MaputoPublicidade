import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createManualQuote, createReceptionIntake, getQuote, prepareExistingQuote } from '@/lib/admin-api';
import RequestForm from '@/components/admin/RequestForm';
import NewQuotePage from './page';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => true }) }));
vi.mock('@/lib/admin-api', () => ({
  getClientOptions: vi.fn().mockResolvedValue([{ id: 1, name: 'Ana', company: 'Empresa Horizonte', email: 'ana@example.com', nuit: '400123456' }]),
  getProducts: vi.fn().mockResolvedValue([]), createManualQuote: vi.fn(), prepareProposal: vi.fn(),
  createReceptionIntake: vi.fn(), getQuote: vi.fn(), prepareExistingQuote: vi.fn(),
}));

describe('Proposal client identity', () => {
  beforeEach(() => vi.clearAllMocks());
  it('registers a telephone request without requiring prices or email', async () => {
    vi.mocked(createReceptionIntake).mockResolvedValue({ quote_reference: 'MP-0002-2026', order_reference: null } as Awaited<ReturnType<typeof createReceptionIntake>>);
    render(<NewQuotePage />);
    await screen.findByRole('option', { name: 'Ana — Empresa Horizonte' });
    fireEvent.change(screen.getByLabelText('Nome do cliente ou empresa *'), { target: { value: 'Cliente telefone' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '841234567' } });
    fireEvent.change(screen.getByLabelText('Origem do pedido'), { target: { value: 'phone' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Cartões' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registar pedido' }));
    await waitFor(() => expect(createReceptionIntake).toHaveBeenCalled());
    expect(vi.mocked(createReceptionIntake).mock.calls[0][0]).toMatchObject({ outcome: 'quote', client_email: '', contact_source: 'phone', items: [{ description: 'Cartões', unit_price: null }] });
    expect(createManualQuote).not.toHaveBeenCalled();
  });

  it('prices the original request using its reference and item identifiers', async () => {
    vi.mocked(getQuote).mockResolvedValue({ reference: 'MP-0003-2026', status: 'received', client_name: 'Empresa', client_email: '', client_phone: '841234567', contact_source: 'phone', estimated_delivery_days: 5,
      items: [{ id: 17, description: 'Vinil', quantity: 2, unit_price: null, notes: 'A3' }],
    } as unknown as Awaited<ReturnType<typeof getQuote>>);
    vi.mocked(prepareExistingQuote).mockResolvedValue({ reference: 'MP-0003-2026' } as Awaited<ReturnType<typeof prepareExistingQuote>>);
    render(<RequestForm reference="MP-0003-2026" />);
    await waitFor(() => expect(screen.getByLabelText('Descrição')).toHaveValue('Vinil'));
    expect(screen.queryByRole('button', { name: 'Encomenda já confirmada' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(prepareExistingQuote).toHaveBeenCalled());
    expect(vi.mocked(prepareExistingQuote).mock.calls[0]).toEqual(['MP-0003-2026', expect.objectContaining({ items: [expect.objectContaining({ item_id: 17, quantity: 2, unit_price: 25, notes: 'A3' })] })]);
    expect(createManualQuote).not.toHaveBeenCalled();
  });
  it('uses one identity input and snapshots registered company NUIT', async () => {
    vi.mocked(createManualQuote).mockResolvedValue({ reference: 'MP-0001-2026' } as Awaited<ReturnType<typeof createManualQuote>>);
    render(<NewQuotePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Preparar proposta' }));
    await screen.findByRole('option', { name: 'Ana — Empresa Horizonte' });
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cliente registado'), { target: { value: '1' } });
    expect(screen.getByLabelText('Nome do cliente ou empresa *')).toHaveValue('Empresa Horizonte');
    expect(screen.getByLabelText('NUIT')).toHaveValue('400123456');
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Cartões' } });
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(createManualQuote).toHaveBeenCalled());
    expect(vi.mocked(createManualQuote).mock.calls[0][0]).toMatchObject({ client_name: 'Empresa Horizonte', client_company: '', client_nuit: '400123456' });
    expect(push).toHaveBeenCalledWith('/admin/orcamentos/MP-0001-2026');
  });
});
