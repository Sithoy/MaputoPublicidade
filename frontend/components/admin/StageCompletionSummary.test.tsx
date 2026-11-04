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
