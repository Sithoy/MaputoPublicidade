import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminQuote } from '@/lib/admin-api';
import { getClientOptions, getProducts, getQuote, prepareExistingQuote } from '@/lib/admin-api';
import { fetchBlobWithAuth, fetchWithAuth } from '@/lib/auth';
import RequestForm from './RequestForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => true }) }));
vi.mock('@/lib/admin-api', () => ({ getClientOptions: vi.fn(), getProducts: vi.fn(), getQuote: vi.fn(), prepareExistingQuote: vi.fn(), createManualQuote: vi.fn(), createReceptionIntake: vi.fn() }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn(), fetchBlobWithAuth: vi.fn(), downloadWithAuth: vi.fn() }));
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
  vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['%PDF-test'], { type: 'application/pdf' }));
  URL.createObjectURL = vi.fn(() => 'blob:proposal-preview');
  URL.revokeObjectURL = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

async function setup(initialQuote = quote, embedded = false) {
  const onSaved = vi.fn(), onBusyChange = vi.fn(), onDirtyChange = vi.fn();
  render(<RequestForm focused embedded={embedded} initialQuote={initialQuote} reference={initialQuote.reference} onSaved={onSaved} onBusyChange={onBusyChange} onDirtyChange={onDirtyChange} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar proposta' })).toBeEnabled());
  return { onSaved, onBusyChange, onDirtyChange };
}

describe('Focused proposal editor', () => {
  it('uses the shared operational identity when embedded without removing editor actions', async () => {
    await setup(quote, true);
    expect(screen.queryByRole('heading', { name: 'Empresa ABC' })).not.toBeInTheDocument();
    expect(screen.getByText(/Proposta em preparação/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar proposta' })).toBeEnabled();
  });
  it('places PDF preview in the commercial summary, not the bottom action bar', async () => {
    await setup();
    expect(within(screen.getByRole('complementary', { name: 'Resumo comercial' })).getByRole('button', { name: 'Guardar e pré-visualizar PDF' })).toBeInTheDocument();
  });

  it('can save an incomplete exempt draft but blocks sending without justification and evidence', async () => {
    await setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aplicar isenção de IVA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('anexe o comprovativo');
    expect(prepareExistingQuote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(prepareExistingQuote).toHaveBeenCalledWith(quote.reference, expect.objectContaining({ tax_rate: 0, vat_exempt: true, vat_exemption_reason: '' })));
  });

  it('uploads exemption evidence after saving and before sending', async () => {
    const { onSaved } = await setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aplicar isenção de IVA' }));
    fireEvent.change(screen.getByLabelText('Justificação da isenção'), { target: { value: 'Declaração apresentada' } });
    const file = new File(['%PDF-1.4'], 'declaracao.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Comprovativo da isenção'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(quote.reference, 'send'));
    const calls = vi.mocked(fetchWithAuth).mock.calls;
    expect(calls[0][0]).toBe(`/api/quotes/${quote.reference}/vat-evidence/`);
    expect((calls[0][1]?.body as FormData).get('file')).toBe(file);
    expect(calls[1][0]).toBe(`/api/quotes/${quote.reference}/proposal-workflow/`);
  });

  it('keeps the exemption file for retry and does not send when uploading fails', async () => {
    const { onSaved } = await setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aplicar isenção de IVA' }));
    fireEvent.change(screen.getByLabelText('Justificação da isenção'), { target: { value: 'Declaração' } });
    fireEvent.change(screen.getByLabelText('Comprovativo da isenção'), { target: { files: [new File(['%PDF-1.4'], 'prova.pdf')] } });
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Falha no envio do comprovativo'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('não foi possível confirmar');
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e enviar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(quote.reference, 'send'));
    expect(vi.mocked(fetchWithAuth).mock.calls[1][1]?.body).toBeInstanceOf(FormData);
  });

  it('returns to 16% when removing an exemption', async () => {
    await setup({ ...quote, commercial_pricing: true, tax_rate: 0, vat_exempt: true });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aplicar isenção de IVA' }));
    expect(screen.getByText('IVA (16%)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Comprovativo da isenção')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(prepareExistingQuote).toHaveBeenCalledWith(quote.reference, expect.objectContaining({ tax_rate: 16, vat_exempt: false })));
  });
  it('defaults unpriced intake proposals to 16% IVA and sends it when saving', async () => {
    await setup({ ...quote, commercial_pricing: false, tax_rate: 0 });
    expect(screen.queryByLabelText('IVA (%)')).not.toBeInTheDocument();
    expect(screen.getByText('IVA (16%)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(prepareExistingQuote).toHaveBeenCalledWith(quote.reference, expect.objectContaining({ tax_rate: 16 })));
  });

  it.each([0, 5, 16])('preserves an existing commercial IVA rate of %s%%', async (tax_rate) => {
    await setup({ ...quote, commercial_pricing: true, tax_rate });
    expect(screen.getByText(`IVA (${tax_rate}%)`)).toBeInTheDocument();
  });

  it('switches discount type with radio buttons, resetting the amount and updating totals', async () => {
    await setup();
    expect(screen.getByRole('radio', { name: 'MZN' })).toBeChecked();
    fireEvent.change(screen.getByLabelText('Valor do desconto (MZN)'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('radio', { name: '%' }));
    expect(screen.getByLabelText('Valor do desconto (%)')).toHaveValue(0);
    fireEvent.change(screen.getByLabelText('Valor do desconto (%)'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(prepareExistingQuote).toHaveBeenCalledWith(quote.reference, expect.objectContaining({ discount_type: 'percentage', discount_percentage: 10, discount_amount: 0, tax_rate: 16 })));
  });

  it('saves current edits and previews the authenticated PDF without sending or leaving the editor', async () => {
    const { onSaved, onDirtyChange, onBusyChange } = await setup();
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e pré-visualizar PDF' }));
    const preview = await screen.findByRole('dialog');
    expect(prepareExistingQuote).toHaveBeenCalledWith(quote.reference, expect.objectContaining({ items: [expect.objectContaining({ unit_price: 12 })] }));
    expect(fetchBlobWithAuth).toHaveBeenCalledWith(`/api/quotes/${quote.reference}/pdf/`);
    expect(vi.mocked(prepareExistingQuote).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(fetchBlobWithAuth).mock.invocationCallOrder[0]);
    expect(within(preview).getByTitle('PDF da proposta')).toHaveAttribute('src', 'blob:proposal-preview');
    expect(within(preview).getByRole('link', { name: 'Descarregar PDF' })).toHaveAttribute('download', `Proposta-${quote.reference}.pdf`);
    expect(onSaved).not.toHaveBeenCalled();
    expect(fetchWithAuth).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(onDirtyChange).toHaveBeenCalledWith(false);
    expect(onBusyChange.mock.calls.map(([busy]) => busy)).toEqual([true, false]);
    fireEvent.click(within(preview).getByRole('button', { name: 'Fechar PDF' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:proposal-preview');
    expect(screen.getByLabelText('Preço unitário')).toHaveValue('12');
  });

  it('keeps the editor available and explains that the draft was saved when PDF loading fails', async () => {
    const { onSaved } = await setup();
    vi.mocked(fetchBlobWithAuth).mockRejectedValueOnce(new Error('Ligação indisponível'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e pré-visualizar PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O rascunho foi guardado, mas não foi possível abrir o PDF');
    expect(screen.getByRole('button', { name: 'Guardar e pré-visualizar PDF' })).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
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
