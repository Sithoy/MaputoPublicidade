import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { getQuote } from '@/lib/admin-api';
import ReceptionPage from './page';

const auth = vi.hoisted(() => ({ loading: false, allowed: true }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ user: { id: 1 }, loading: auth.loading, can: () => auth.allowed }) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/lib/admin-api', () => ({ getQuote: vi.fn(), convertQuoteToOrder: vi.fn(), downloadQuotePdf: vi.fn() }));
vi.mock('@/components/admin/ProposalWorkflowCard', () => ({ ProposalWorkflowCard: () => <p>Revisão da mesma proposta</p> }));
vi.mock('@/components/admin/RequestForm', () => ({ default: ({ onSaved }: { onSaved: (ref: string) => void }) => <button onClick={() => onSaved('MP-0001-2026')}>Guardar proposta no espaço</button> }));
const quote = { reference: 'MP-0001-2026', client_name: 'Empresa ABC', status: 'reviewing', reception: { completed_at: '2026-10-12', owner_name: 'Dário' }, proposal_workflow: { stage: 'review', prepared_by: 'Dário', prepared_by_id: 1 }, items: [] };
beforeEach(() => {
  vi.clearAllMocks(); auth.loading = false; auth.allowed = true;
  vi.mocked(fetchWithAuth).mockResolvedValue({ results: [quote], next: null, count: 30 });
  vi.mocked(getQuote).mockResolvedValue(quote as never);
});
describe('Reception workspace', () => {
  it('keeps review and preparation in the same selected order', async () => {
    render(<ReceptionPage />);
    expect(await screen.findByText('Fila operacional (30)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    expect(await screen.findByText('Revisão da mesma proposta')).toBeInTheDocument();
    expect(screen.getByText('Em espera')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2 Preparar proposta/ }));
    fireEvent.click(await screen.findByText('Guardar proposta no espaço'));
    await waitFor(() => expect(getQuote).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: /MP-0001-2026 · Empresa ABC/ })).toBeInTheDocument();
  });
  it('uses server filters and keeps completed requests available', async () => {
    render(<ReceptionPage />); await screen.findByText('Fila operacional (30)');
    fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'mine' } });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=active&proposal_queue=mine'));
    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: 'closed' } });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=closed&proposal_queue=mine'));
  });
  it('does not fetch while authentication is loading or permission is denied', () => {
    auth.loading = true; const view = render(<ReceptionPage />); expect(fetchWithAuth).not.toHaveBeenCalled();
    auth.loading = false; auth.allowed = false; view.rerender(<ReceptionPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso'); expect(fetchWithAuth).not.toHaveBeenCalled();
  });
  it('reports an unavailable queue', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Offline')); render(<ReceptionPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });
});
