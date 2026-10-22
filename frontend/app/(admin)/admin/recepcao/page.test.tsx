import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { getQuote } from '@/lib/admin-api';
import ReceptionPage from './page';

const auth = vi.hoisted(() => ({ loading: false, allowed: true, editable: true, session: null as { editor_name: string; editor_id?: number } | null, acquire: vi.fn().mockResolvedValue(true) }));
vi.mock('@/hooks/useReceptionEdit', () => ({ useReceptionEdit: () => ({ editable: auth.editable, pending: false, session: auth.session, error: '', acquire: auth.acquire, release: vi.fn() }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ user: { id: 1 }, loading: auth.loading, can: () => auth.allowed }) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/lib/admin-api', () => ({ getQuote: vi.fn(), convertQuoteToOrder: vi.fn(), downloadQuotePdf: vi.fn() }));
vi.mock('@/components/admin/ProposalWorkflowCard', () => ({ ProposalWorkflowCard: () => <p>Revisão da mesma proposta</p> }));
vi.mock('@/components/admin/RequestForm', () => ({ default: ({ onSaved }: { onSaved: (ref: string) => void }) => <><input aria-label="Detalhe do rascunho" /><button onClick={() => onSaved('MP-0001-2026')}>Guardar proposta no espaço</button></> }));
vi.mock('@/components/admin/ReceptionRequestPanel', () => ({ ReceptionRequestPanel: ({ onChange }: { onChange: (value: null) => void }) => <button onClick={() => onChange(null)}>Concluir triagem</button> }));
const quote = { reference: 'MP-0001-2026', client_name: 'Empresa ABC', status: 'reviewing', reception: { completed_at: '2026-10-12', owner_name: 'Dário' }, proposal_workflow: { stage: 'review', prepared_by: 'Dário', prepared_by_id: 1 }, items: [] };
const hq = { scope: 'mine', unassigned_team: 4, updated_at: '2026-10-12T10:00:00Z', counts: { total: 30, urgent: 2, upcoming: 3, briefing: 5, proposal: 6, send: 2, delivery: 1, review: 4, client: 8, production: 4, handover: 0, messages: 3, messages_general: 2 } };
beforeEach(() => {
  window.history.replaceState({}, '', '/admin/recepcao');
  vi.clearAllMocks(); auth.loading = false; auth.allowed = true; auth.editable = true; auth.session = null; auth.acquire.mockResolvedValue(true);
  vi.mocked(fetchWithAuth).mockImplementation(async (path) => path.startsWith('/api/reception/hq/') ? hq : { results: [quote], next: null, count: 30 });
  vi.mocked(getQuote).mockResolvedValue(quote as never);
});
describe('Reception workspace', () => {
  it('offers a confirmed resume for the current user without requiring a supervisor', async () => {
    auth.editable = false; auth.session = { editor_id: 1, editor_name: 'Dário' };
    render(<ReceptionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    const resume = await screen.findByRole('button', { name: 'Retomar a minha edição' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(resume);
    expect(auth.acquire).not.toHaveBeenCalled();
    confirm.mockReturnValue(true); fireEvent.click(resume);
    await waitFor(() => expect(auth.acquire).toHaveBeenCalledWith('', true));
    confirm.mockRestore();
  });

  it('preserves direct links to an order without auto-opening a different task', async () => {
    window.history.replaceState({}, '', '/admin/recepcao?pedido=MP-0001-2026');
    render(<ReceptionPage />);
    expect(await screen.findByRole('region', { name: 'Resumo do pedido' })).toBeInTheDocument();
    expect(getQuote).toHaveBeenCalledWith('MP-0001-2026');
    expect(screen.queryByRole('region', { name: 'Lista de tarefas' })).not.toBeInTheDocument();
  });

  it('protects an unsaved draft when returning to the list', async () => {
    render(<ReceptionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    await screen.findByRole('region', { name: 'Resumo do pedido' });
    fireEvent.click(screen.getByRole('button', { name: /2 Preparar proposta/ }));
    fireEvent.change(await screen.findByLabelText('Detalhe do rascunho'), { target: { value: 'Por guardar' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText('Detalhe do rascunho')).toHaveValue('Por guardar');
    expect(screen.queryByRole('region', { name: 'Lista de tarefas' })).not.toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(await screen.findByRole('region', { name: 'Lista de tarefas' })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('opens in consultation without personal queues and keeps communication available', async () => {
    auth.editable = false;
    render(<ReceptionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    expect(await screen.findByRole('button', { name: 'Iniciar edição' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Resumo do pedido' })).toBeInTheDocument();
    expect(auth.acquire).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Trabalho' }));
    expect(screen.getByText('Revisão da mesma proposta').closest('fieldset')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mensagens' })).toBeEnabled();
    expect(screen.queryByLabelText('Responsável')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'O meu trabalho' })).not.toBeInTheDocument();
  });
  it('keeps review and preparation in the same selected order', async () => {
    render(<ReceptionPage />);
    expect(await screen.findByRole('heading', { name: /Todos os trabalhos.*30/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    await screen.findByRole('region', { name: 'Resumo do pedido' });
    expect(screen.getByText('O que acontece a seguir?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprovação comercial/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /4 Produção e entrega/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Agora' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Percurso do pedido' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2 Preparar proposta/ }));
    expect(await screen.findByRole('region', { name: 'Espaço da proposta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar proposta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar edição' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Pedido em foco' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumo do pedido' })).not.toBeInTheDocument();
    expect(screen.queryByText('Revisão da mesma proposta')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByText('Guardar proposta no espaço'));
    await waitFor(() => expect(getQuote).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('heading', { name: 'Empresa ABC' })).toBeInTheDocument();
  });
  it('uses server filters and keeps completed requests available', async () => {
    render(<ReceptionPage />); await screen.findByRole('heading', { name: /Todos os trabalhos.*30/ });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=active&hq=1&page_size=10'));
    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: 'closed' } });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=closed&hq=1&page_size=10'));
  });

  it('opens a prepared task directly in the focused editor and reserves it once', async () => {
    auth.editable = false;
    auth.acquire.mockImplementation(async () => { auth.editable = true; return true; });
    vi.mocked(getQuote).mockResolvedValue({ ...quote, proposal_workflow: { ...quote.proposal_workflow, stage: 'draft' } } as never);
    render(<ReceptionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    expect(await screen.findByLabelText('Detalhe do rascunho')).toBeInTheDocument();
    expect(auth.acquire).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region', { name: 'Pedido em foco' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo atendimento' })).not.toBeInTheDocument();
  });

  it('moves from completed briefing straight into the proposal workspace', async () => {
    const briefing = { ...quote, reception: null, proposal_workflow: { ...quote.proposal_workflow, stage: 'draft', prepared_by_id: null } };
    const prepared = { ...quote, proposal_workflow: { ...quote.proposal_workflow, stage: 'draft' } };
    vi.mocked(getQuote).mockResolvedValueOnce(briefing as never).mockResolvedValue(prepared as never);
    render(<ReceptionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    await screen.findByRole('region', { name: 'Resumo do pedido' });
    fireEvent.click(screen.getByRole('button', { name: 'Trabalho' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Concluir triagem' }));
    expect(await screen.findByLabelText('Detalhe do rascunho')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Espaço da proposta' })).toBeInTheDocument();
  });

  it('keeps an actively reserved proposal read-only with no editing bypass', async () => {
    auth.editable = false; auth.session = { editor_name: 'Ana' }; auth.acquire.mockResolvedValue(false);
    vi.mocked(getQuote).mockResolvedValue({ ...quote, proposal_workflow: { ...quote.proposal_workflow, stage: 'draft' } } as never);
    render(<ReceptionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    expect(await screen.findByText(/Em edição por Ana. Pode consultar/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Consulta da proposta' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Detalhe do rascunho')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar proposta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
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
  it('starts with shared priorities and opens their exact task queue', async () => {
    render(<ReceptionPage />);
    expect(await screen.findByRole('heading', { name: 'Agora' })).toBeInTheDocument();
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/reception/hq/?scope=all');
    fireEvent.click(screen.getByRole('button', { name: /Propostas prontas para enviar/ }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=active&hq=1&page_size=10&task=send'));
    expect(screen.queryByLabelText('Responsável')).not.toBeInTheDocument();
  });
  it('offers an on-screen proposal without downloading or entering edit mode', async () => {
    render(<ReceptionPage />); fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    await screen.findByRole('region', { name: 'Resumo do pedido' });
    fireEvent.click(screen.getByRole('button', { name: 'Proposta' }));
    expect(screen.getByRole('region', { name: 'Consulta da proposta' })).toBeInTheDocument();
    expect(screen.queryByText('Guardar proposta no espaço')).not.toBeInTheDocument();
  });
  it('shows only the task list until a task is opened and preserves the agenda', async () => {
    auth.editable = false;
    render(<ReceptionPage />);
    expect(await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Espaço do pedido' })).not.toBeInTheDocument();
    expect(getQuote).not.toHaveBeenCalled();
    expect(auth.acquire).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Dia da recepção' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A acompanhar' })).toBeInTheDocument();
    const filters = screen.getByRole('region', { name: 'Filtros dos pedidos' });
    expect(filters).toContainElement(screen.getByLabelText('Mostrar'));
    expect(screen.getByRole('region', { name: 'Lista de tarefas' })).not.toContainElement(filters);
    fireEvent.click(screen.getByRole('button', { name: /MP-0001-2026 Empresa ABC/ }));
    await screen.findByRole('region', { name: 'Resumo do pedido' });
    expect(getQuote).toHaveBeenCalledWith('MP-0001-2026');
    expect(screen.queryByRole('region', { name: 'Lista de tarefas' })).not.toBeInTheDocument();
    const back = screen.getByRole('button', { name: 'Voltar à lista' });
    expect(back).toHaveFocus();
    fireEvent.click(back);
    expect(await screen.findByRole('region', { name: 'Lista de tarefas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agora' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Espaço do pedido' })).not.toBeInTheDocument();
  });
  it('does not preview an order when the filtered queue is empty', async () => {
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => path.startsWith('/api/reception/hq/') ? hq : { results: [], next: null, count: 0 });
    render(<ReceptionPage />);
    expect(await screen.findByText('Nenhum pedido neste filtro.')).toBeInTheDocument();
    expect(getQuote).not.toHaveBeenCalled();
    expect(auth.acquire).not.toHaveBeenCalled();
  });
  it('groups the filters, task list and pagination without an empty detail panel', async () => {
    render(<ReceptionPage />);
    await screen.findByRole('button', { name: /MP-0001-2026 Empresa ABC/ });
    const desk = screen.getByRole('region', { name: 'Mesa de trabalho da Recepção' });
    expect(desk).toContainElement(screen.getByRole('region', { name: 'Filtros dos pedidos' }));
    expect(desk).toContainElement(screen.getByRole('region', { name: 'Lista de tarefas' }));
    expect(screen.queryByRole('region', { name: 'Espaço do pedido' })).not.toBeInTheDocument();
    expect(desk.lastElementChild).toContainElement(screen.getByRole('navigation', { name: 'Paginação dos pedidos' }));
    expect(desk).not.toContainElement(screen.getByRole('heading', { name: 'Agora' }));
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Seguinte' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Mais pedidos' })).not.toBeInTheDocument();
  });
  it('shows ten tasks per page and keeps page and filters when returning from a task', async () => {
    const second = { ...quote, reference: 'MP-0002-2026', client_name: 'Outra empresa' };
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => path.startsWith('/api/reception/hq/') ? hq : path.includes('page=2') ? { results: [second], next: null, count: 11 } : { results: Array.from({ length: 10 }, (_, index) => ({ ...quote, reference: `MP-${String(index + 1).padStart(4, '0')}-2026` })), next: 'https://backend.example/api/quotes/?page=2', count: 11 });
    render(<ReceptionPage />);
    await screen.findByText('1–10 de 11 pedidos');
    expect(within(screen.getByRole('table', { name: 'Tarefas da recepção' })).getAllByRole('row')).toHaveLength(11);
    expect(getQuote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Seguinte' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=active&hq=1&page_size=10&page=2'));
    expect(await screen.findByRole('button', { name: /MP-0002-2026 Outra empresa/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /MP-0001-2026 Empresa ABC/ })).not.toBeInTheDocument();
    expect(screen.getByText('11–11 de 11 pedidos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /MP-0002-2026 Outra empresa/ }));
    await screen.findByRole('region', { name: 'Resumo do pedido' });
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(await screen.findByText('11–11 de 11 pedidos')).toBeInTheDocument();
    expect(getQuote).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(await screen.findByText('1–10 de 11 pedidos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seguinte' }));
    await screen.findByText('11–11 de 11 pedidos');
    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: 'closed' } });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/?operational_state=closed&hq=1&page_size=10'));
    expect(await screen.findByText('1–10 de 11 pedidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });
});
