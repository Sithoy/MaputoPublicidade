import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import type { AdminQuote } from '@/lib/admin-api';
import { ReceptionCaseContext } from './ReceptionCaseContext';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const quote = { reference: 'MP-0001-2026', workdesk: { owner_id: 1, owner_name: 'Dário', requested_date: '2026-12-20', confirmed_date: null, last_contact_at: null, follow_up_date: '2026-12-15', follow_up_note: 'Confirmar cores', blocker: 'Aprovação do Comercial', waiting_since: null } } as AdminQuote;
beforeEach(() => vi.resetAllMocks());
describe('Order context and follow-up', () => {
  it('shows only stage-relevant facts without turning requested dates into commitments', () => {
    const props = { canSchedule: false, busy: false, onBusy: vi.fn(), onSaved: vi.fn(), onDirty: vi.fn() };
    const customerQuote = { ...quote, valid_until: '2026-12-30', proposal_workflow: { stage: 'sent' } } as AdminQuote;
    const { rerender } = render(<ReceptionCaseContext {...props} quote={customerQuote} />);
    expect(screen.getByText('Validade da proposta')).toBeInTheDocument();
    expect(screen.queryByText('Data pretendida pelo cliente')).not.toBeInTheDocument();
    expect(screen.getByText('Sem envio registado')).toBeInTheDocument();
    rerender(<ReceptionCaseContext {...props} quote={{ ...customerQuote, order_reference: 'ORD-0001' }} />);
    expect(screen.getByText('Entrega / levantamento agendado').nextElementSibling).toHaveTextContent('Por confirmar');
    expect(screen.queryByText('Validade da proposta')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar seguimento' })).not.toBeInTheDocument();
  });
  it('keeps one next-action panel and hides it around a focused stage', () => {
    const props = { quote, canSchedule: false, busy: false, onBusy: vi.fn(), onSaved: vi.fn(), onDirty: vi.fn() };
    const { rerender } = render(<ReceptionCaseContext {...props} nextAction={<button>Abrir etapa</button>} />);
    expect(screen.getByRole('region', { name: 'Próxima ação' })).toBeInTheDocument();
    expect(screen.getByText(/À espera de:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir etapa' })).toBeInTheDocument();
    rerender(<ReceptionCaseContext {...props} compact />);
    expect(screen.queryByRole('region', { name: 'Próxima ação' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Próximo seguimento/)).not.toBeInTheDocument();
  });
  it('saves and clears a follow-up without reloading or discarding the other form', async () => {
    const saved = vi.fn(); const busy = vi.fn();
    vi.mocked(fetchWithAuth).mockResolvedValue({ date: null, note: '' });
    render(<ReceptionCaseContext quote={quote} canSchedule busy={false} onBusy={busy} onSaved={saved} onDirty={vi.fn()} />);
    fireEvent.click(screen.getByText(/Próximo seguimento/));
    fireEvent.click(screen.getByRole('button', { name: 'Concluir seguimento' }));
    await waitFor(() => expect(saved).toHaveBeenCalledWith({ date: null, note: '' }));
    expect(JSON.parse(vi.mocked(fetchWithAuth).mock.calls[0][1]!.body as string)).toEqual({ date: null, note: '' });
    expect(busy).toHaveBeenLastCalledWith(false);
  });
  it('retains the draft when the API fails', async () => {
    const saved = vi.fn();
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Ligação indisponível'));
    render(<ReceptionCaseContext quote={quote} canSchedule busy={false} onBusy={vi.fn()} onSaved={saved} onDirty={vi.fn()} />);
    fireEvent.click(screen.getByText(/Próximo seguimento/));
    fireEvent.change(screen.getByLabelText('O que precisa de acompanhar?'), { target: { value: 'Nova nota por guardar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar seguimento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ligação indisponível');
    expect(screen.getByLabelText('O que precisa de acompanhar?')).toHaveValue('Nova nota por guardar');
    expect(saved).not.toHaveBeenCalled();
  });
});
