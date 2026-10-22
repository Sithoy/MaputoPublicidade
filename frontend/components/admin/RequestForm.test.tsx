import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminQuote } from '@/lib/admin-api';
import { getClientOptions, getProducts, getQuote, prepareExistingQuote } from '@/lib/admin-api';
import { fetchWithAuth } from '@/lib/auth';
import RequestForm from './RequestForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => true }) }));
vi.mock('@/lib/admin-api', () => ({ getClientOptions: vi.fn(), getProducts: vi.fn(), getQuote: vi.fn(), prepareExistingQuote: vi.fn(), createManualQuote: vi.fn(), createReceptionIntake: vi.fn() }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/components/admin/ProposalAssistant', () => ({ ProposalAssistant: () => null }));
vi.mock('@/components/admin/DocumentItemsEditor', () => ({
  newDocumentLine: () => ({ key: 'line', description: '', quantity: '1', unit_price: '' }),
  DocumentItemsEditor: ({ lines, onChange }: { lines: Array<{ key: string; description: string; quantity: string; unit_price: string }>; onChange: (value: unknown[]) => void }) => <section aria-label="Artigos da proposta">{lines.map((line) => <div key={line.key}><p>{line.description} · {line.quantity} unidades</p><label>Preço unitário<input value={line.unit_price} onChange={(event) => onChange([{ ...line, unit_price: event.target.value }])} /></label></div>)}<button type="button" onClick={() => onChange([])}>Remover artigos</button></section>,
}));

const quote = {
  id: 1, reference: 'MP-0001-2026', status: 'reviewing', client_name: 'Empresa ABC', client_email: 'cliente@example.com', client_phone: '841234567', client_nuit: '400123456',
  estimated_delivery_days: 5, payment_option: 'deposit_50', final_price: 1000,
  items: [{ id: 1, description: 'Polos para campanha', quantity: 200, unit_price: 5, notes: '' }],
  proposal_workflow: { stage: 'draft', version: 2 },
} as unknown as AdminQuote;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClientOptions).mockResolvedValue([]);
  vi.mocked(getProducts).mockResolvedValue([]);
  vi.mocked(getQuote).mockResolvedValue(quote);
  vi.mocked(prepareExistingQuote).mockResolvedValue(quote);
  vi.mocked(fetchWithAuth).mockResolvedValue(quote);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

async function setup() {
  const onSaved = vi.fn(), onBusyChange = vi.fn(), onDirtyChange = vi.fn();
  render(<RequestForm focused initialQuote={quote} reference={quote.reference} onSaved={onSaved} onBusyChange={onBusyChange} onDirtyChange={onDirtyChange} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar proposta' })).toBeEnabled());
  return { onSaved, onBusyChange, onDirtyChange };
}

describe('Focused proposal editor', () => {
  it('inherits the client and materials with one action bar and no unrelated intake controls', async () => {
    await setup();
    expect(screen.getByRole('heading', { name: 'Empresa ABC' })).toBeInTheDocument();
    expect(screen.getByText('Polos para campanha · 200 unidades')).toBeInTheDocument();
    expect(screen.getByLabelText('NUIT')).toHaveValue('400123456');
    expect(screen.getAllByRole('button', { name: 'Guardar proposta' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Guardar e enviar' })).toHaveLength(1);
    expect(screen.getByRole('complementary', { name: 'Resumo comercial' })).toBeInTheDocument();
    expect(screen.queryByText('Como pretende começar?')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Prioridade')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar edição|Editar proposta|Preparar proposta/ })).not.toBeInTheDocument();
    expect(getQuote).not.toHaveBeenCalled();
    expect(getClientOptions).not.toHaveBeenCalled();
  });

  it('saves the current form before recording its private version', async () => {
    const { onSaved, onBusyChange } = await setup();
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(quote.reference, 'save'));
    expect(prepareExistingQuote).toHaveBeenCalledWith(quote.reference, expect.objectContaining({ items: [expect.objectContaining({ quantity: 200, unit_price: 8 })] }));
    expect(fetchWithAuth).toHaveBeenCalledWith(`/api/quotes/${quote.reference}/proposal-workflow/`, expect.objectContaining({ body: JSON.stringify({ action: 'save', version: 2, comment: '' }) }));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(onBusyChange.mock.calls.map(([busy]) => busy)).toEqual([true, false]);
  });

  it('confirms, persists and then sends the newly saved conditions', async () => {
    const { onSaved } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(quote.reference, 'send'));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(vi.mocked(prepareExistingQuote).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(fetchWithAuth).mock.invocationCallOrder[0]);
    expect(JSON.parse(vi.mocked(fetchWithAuth).mock.calls[0][1]?.body as string)).toEqual({ action: 'send', version: 2, comment: '' });
  });

  it('does not mutate the proposal if send confirmation is cancelled', async () => {
    await setup(); vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    expect(prepareExistingQuote).not.toHaveBeenCalled();
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });

  it('retains the editor and draft when publication fails after saving', async () => {
    const { onSaved } = await setup();
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Ligação indisponível'));
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('não foi possível confirmar');
    expect(screen.getByLabelText('Preço unitário')).toHaveValue('9');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar e enviar' })).toBeEnabled();
  });

  it('recognizes a completed send after a lost response without publishing again', async () => {
    const { onSaved } = await setup();
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Resposta perdida'));
    vi.mocked(getQuote).mockResolvedValueOnce({ ...quote, proposal_workflow: { ...quote.proposal_workflow!, stage: 'sent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(quote.reference, 'send'));
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
    expect(prepareExistingQuote).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('updates totals and tracks item removal as an unsaved change', async () => {
    const { onDirtyChange } = await setup();
    const summary = screen.getByRole('complementary', { name: 'Resumo comercial' });
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '10' } });
    expect(within(summary).getAllByText(/2[\s.,]?000/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Remover artigos' }));
    expect(onDirtyChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Preencha a descrição');
    expect(prepareExistingQuote).not.toHaveBeenCalled();
  });
});
