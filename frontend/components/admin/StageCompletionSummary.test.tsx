import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrder, type AdminQuote } from '@/lib/admin-api';
import { StageCompletionSummary } from './StageCompletionSummary';

const auth = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ can: () => auth.allowed }) }));
vi.mock('@/lib/admin-api', () => ({ getOrder: vi.fn() }));
vi.mock('@/components/PrivateArtPreview', () => ({ PrivateArtPreview: ({ label }: { label: string }) => <button>{label}</button> }));
vi.mock('@/components/QuoteRequestEvidence', () => ({ QuoteRequestEvidence: () => <p>Materiais do briefing</p> }));
const quote = { reference: 'MP-0001-2026', order_reference: 'ENC-0001', items: [], journey: { label: 'Produção', steps: [] } } as unknown as AdminQuote;
beforeEach(() => { vi.clearAllMocks(); auth.allowed = true; });

describe('Stage completion summary', () => {
  it('shows briefing details immediately without collapsible sections or stage logs', () => {
    const { container } = render(<StageCompletionSummary quote={{ ...quote, notes: '200 polos para a campanha de verão', activity: [
      { id: 1, action: 'reception_handoff', actor_name: 'Editor anterior', created_at: '2026-11-01T10:00:00Z', comment: 'Registo antigo apenas para os logs' },
      { id: 2, action: 'reception_handoff', actor_name: 'Ana', created_at: '2026-11-04T10:00:00Z' },
    ] }} step={0} onCurrent={() => {}} />);
    expect(screen.getByRole('region', { name: 'Resumo do briefing' })).toHaveTextContent('200 polos para a campanha de verão');
    expect(screen.getByText('Materiais do briefing')).toBeVisible();
    expect(screen.getByText('Ana')).toBeVisible();
    expect(screen.queryByText('Editor anterior')).not.toBeInTheDocument();
    expect(screen.queryByText('Registo antigo apenas para os logs')).not.toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
  });
  it('shows proposal items and conditions directly, attributed only to the final recorded action', () => {
    const { container } = render(<StageCompletionSummary quote={{ ...quote, final_price: 20000, estimated_delivery_days: 7, payment_option: 'deposit_50', terms: 'Entrega nas instalações do cliente.', items: [{ id: 1, description: 'Polos personalizados', quantity: 200, notes: 'Cor verde; logótipo no peito.' }] as AdminQuote['items'], proposal_workflow: { version: 2, history: [
      { action: 'Proposta guardada', version: 1, actor: 'Editor anterior', at: '2026-11-01T10:00:00Z', comment: 'Histórico detalhado' },
      { action: 'Proposta guardada', version: 2, actor: 'Ana', at: '2026-11-04T10:00:00Z', comment: '' },
    ] } as AdminQuote['proposal_workflow'] }} step={1} onCurrent={() => {}} />);
    const summary = screen.getByRole('region', { name: 'Resumo da proposta' });
    expect(summary).toHaveTextContent('200 ×');
    expect(summary).toHaveTextContent('Polos personalizados');
    expect(summary).toHaveTextContent('Cor verde; logótipo no peito.');
    expect(summary).toHaveTextContent('7 dias úteis');
    expect(summary).toHaveTextContent('50% adiantado + 50% na entrega');
    expect(summary).toHaveTextContent('Entrega nas instalações do cliente.');
    expect(screen.getByText('Ana')).toBeVisible();
    expect(screen.queryByText('Editor anterior')).not.toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
  });
  it('shows missing attribution explicitly and returns to the active stage without editing', () => {
    const onCurrent = vi.fn();
    render(<StageCompletionSummary quote={quote} step={0} onCurrent={onCurrent} />);
    expect(screen.getByRole('region', { name: 'Registo da etapa' })).toHaveTextContent('Briefing encaminhado');
    expect(screen.getAllByText('Não registado')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à etapa atual →' }));
    expect(onCurrent).toHaveBeenCalledOnce();
    expect(getOrder).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('labels skipped art as not required, never as art completed', () => {
    render(<StageCompletionSummary quote={{ ...quote, journey: { ...quote.journey!, steps: Array.from({ length: 4 }, () => ({ key: 'art', label: 'Arte', skipped: true })) } }} step={3} onCurrent={() => {}} />);
    expect(screen.getByText('Este trabalho não requer esta etapa')).toBeInTheDocument();
    expect(screen.queryByText('Etapa concluída', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText(/Histórico da etapa/)).not.toBeInTheDocument();
  });
  it('does not fetch order data without order-view permission', () => {
    auth.allowed = false;
    render(<StageCompletionSummary quote={quote} step={5} onCurrent={() => {}} />);
    expect(screen.getByText('A sua função não permite consultar os registos da encomenda.')).toBeInTheDocument();
    expect(getOrder).not.toHaveBeenCalled();
  });
  it('loads completion actors and offers a retry without making a workflow mutation', async () => {
    vi.mocked(getOrder).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ activity: [{ id: 1, action: 'status_changed', to_status: 'ready', actor_name: 'Marta', created_at: '2026-11-04T10:00:00Z' }] } as never);
    render(<StageCompletionSummary quote={quote} step={5} onCurrent={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível consultar');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByText('Marta')).toBeInTheDocument());
    expect(getOrder).toHaveBeenCalledTimes(2);
    expect(getOrder).toHaveBeenLastCalledWith('ENC-0001');
  });
  it('does not show the previous order while a different record is loading', async () => {
    vi.mocked(getOrder).mockResolvedValueOnce({ activity: [{ id: 1, action: 'status_changed', to_status: 'ready', actor_name: 'Marta', created_at: '2026-11-04T10:00:00Z' }] } as never);
    const view = render(<StageCompletionSummary quote={quote} step={5} onCurrent={() => {}} />);
    await screen.findByText('Marta');
    vi.mocked(getOrder).mockReturnValueOnce(new Promise(() => {}));
    view.rerender(<StageCompletionSummary quote={{ ...quote, order_reference: 'ENC-0002' }} step={5} onCurrent={() => {}} />);
    expect(screen.queryByText('Marta')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('A consultar');
  });
});
