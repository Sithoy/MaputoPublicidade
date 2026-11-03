import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import type { AdminQuote } from '@/lib/admin-api';
import { ReceptionAttention } from './ReceptionAttention';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const quote = { reference: 'MP-0001-2026', validity_days: 15, workdesk: { issues: [{ code: 'proposal_expired', kind: 'expired', label: 'Proposta expirada', due: '2026-10-01' }], risk_window_hours: 48, follow_up_date: '2026-10-02' } } as AdminQuote;
function setup(editable = true, source = quote) {
  const props = { quote: source, editable, canRevise: true, busy: false, onAcquire: vi.fn(), onBusy: vi.fn(), onDirty: vi.fn(), onResolved: vi.fn() };
  render(<ReceptionAttention {...props} />);
  return props;
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue({ detail: 'Registado' }); });

it('requires an editing reservation before recording a resolution', () => {
  const props = setup(false);
  expect(screen.getByRole('button', { name: 'Registar resolução' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reservar atendimento' }));
  expect(props.onAcquire).toHaveBeenCalledOnce();
  expect(fetchWithAuth).not.toHaveBeenCalled();
});

it('prepares a new validity without submitting an approval or sending a message', async () => {
  const props = setup();
  expect(screen.getByLabelText('Validade da nova versão')).toHaveValue('15');
  fireEvent.change(screen.getByLabelText('Resultado / motivo'), { target: { value: 'Rever condições com o cliente' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Registar resolução' }).closest('form')!);
  await waitFor(() => expect(props.onResolved).toHaveBeenCalledOnce());
  expect(fetchWithAuth).toHaveBeenCalledTimes(1);
  expect(fetchWithAuth).toHaveBeenCalledWith('/api/reception/MP-0001-2026/resolve-attention/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'revise_proposal', reason: 'Rever condições com o cliente', validity_days: 15 }) }));
  expect(screen.queryByLabelText('Data e hora proposta · Maputo')).not.toBeInTheDocument();
});

it('preserves a resolution draft on failure and keeps the modal open', async () => {
  vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Outra sessão está a editar'));
  const props = setup();
  fireEvent.change(screen.getByLabelText('Resultado / motivo'), { target: { value: 'Cliente contactado, aguarda decisão' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Registar resolução' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Outra sessão');
  expect(screen.getByLabelText('Resultado / motivo')).toHaveValue('Cliente contactado, aguarda decisão');
  expect(props.onResolved).not.toHaveBeenCalled();
});

it('requests delivery rescheduling instead of writing the confirmed delivery directly', async () => {
  setup(true, { ...quote, order_reference: 'ORD-0001', workdesk: { ...quote.workdesk, issues: [] } } as AdminQuote);
  fireEvent.change(screen.getByLabelText('Como vamos resolver?'), { target: { value: 'request_delivery' } });
  fireEvent.change(screen.getByLabelText('Resultado / motivo'), { target: { value: 'Cliente pediu outra data' } });
  fireEvent.change(screen.getByLabelText('Data e hora proposta · Maputo'), { target: { value: '2030-01-20T10:00' } });
  fireEvent.change(screen.getByLabelText('Data para acompanhar'), { target: { value: '2030-01-19' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Registar resolução' }).closest('form')!);
  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledOnce());
  const [path, options] = vi.mocked(fetchWithAuth).mock.calls[0];
  expect(path).toContain('/resolve-attention/');
  expect(JSON.parse(options!.body as string)).toMatchObject({ action: 'request_delivery', proposed_delivery: '2030-01-20T08:00:00.000Z', next_date: '2030-01-19' });
  expect(path).not.toContain('/set-delivery/');
});
