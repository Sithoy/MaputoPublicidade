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
const hq = { scope: 'mine', unassigned_team: 4, updated_at: '2026-10-12T10:00:00Z', counts: { total: 30, urgent: 2, upcoming: 3, briefing: 5, proposal: 6, send: 2, delivery: 1, review: 4, client: 8, production: 4, handover: 0, messages: 3, messages_general: 2 } };
beforeEach(() => {
  vi.clearAllMocks(); auth.loading = false; auth.allowed = true;
  vi.mocked(fetchWithAuth).mockImplementation(async (path) => path.startsWith('/api/reception/hq/') ? hq : { results: [quote], next: null, count: 30 });
  vi.mocked(getQuote).mockResolvedValue(quote as never);
});
describe('Reception workspace', () => {
  it('keeps review and preparation in the same selected order', async () => {
    render(<ReceptionPage />);
    expect(await screen.findByRole('heading', { name: /Todos os trabalhos.*30/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    expect(await screen.findByText('Revisão da mesma proposta')).toBeInTheDocument();
    expect(screen.getByText('O que estamos a aguardar?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agora' })).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Percurso do pedido/));
    fireEvent.click(screen.getByRole('button', { name: /2 Preparar proposta/ }));
    expect(screen.getByRole('region', { name: 'Consulta da proposta' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar proposta' }));
    fireEvent.click(await screen.findByText('Guardar proposta no espaço'));
    await waitFor(() => expect(getQuote).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: 'Empresa ABC' })).toBeInTheDocument();
  });
  it('uses server filters and keeps completed requests available', async () => {
    render(<ReceptionPage />); await screen.findByRole('heading', { name: /Todos os trabalhos.*30/ });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=active&hq=1&proposal_queue=mine'));
    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: 'closed' } });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=closed&hq=1&proposal_queue=mine'));
  });
  it('does not fetch while authentication is loading or permission is denied', () => {
    auth.loading = true; const view = render(<ReceptionPage />); expect(fetchWithAuth).not.toHaveBeenCalled();
    auth.loading = false; auth.allowed = false; view.rerender(<ReceptionPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso'); expect(fetchWithAuth).not.toHaveBeenCalled();
  });
  it('reports an unavailable queue', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Offline')); render(<ReceptionPage />);
    expect(await screen.findByText('Não foi possível carregar a fila operacional.')).toBeInTheDocument();
  });
  it('starts with personal priorities and opens their exact task queue', async () => {
    render(<ReceptionPage />);
    expect(await screen.findByRole('button', { name: /4 por assumir na equipa/ })).toBeInTheDocument();
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/reception/hq/?scope=mine');
    fireEvent.click(screen.getByRole('button', { name: /Propostas prontas para enviar/ }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=active&hq=1&proposal_queue=mine&task=send'));
    fireEvent.click(screen.getByRole('button', { name: /4 por assumir na equipa/ }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/reception/hq/?scope=unassigned'));
  });
  it('offers an on-screen proposal without downloading or entering edit mode', async () => {
    render(<ReceptionPage />); fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    await screen.findByText('Revisão da mesma proposta');
    fireEvent.click(screen.getByRole('button', { name: 'Proposta' }));
    expect(screen.getByRole('region', { name: 'Consulta da proposta' })).toBeInTheDocument();
    expect(screen.queryByText('Guardar proposta no espaço')).not.toBeInTheDocument();
  });
});
