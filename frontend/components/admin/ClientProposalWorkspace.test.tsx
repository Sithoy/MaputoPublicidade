import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientProposalWorkspace } from './ClientProposalWorkspace';
import { fetchWithAuth } from '@/lib/auth';
import type { AdminQuote } from '@/lib/admin-api';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('./ProposalReadView', () => ({ ProposalReadView: () => <p>Proposta em consulta</p> }));
vi.mock('./EmailDesk', () => ({ EmailDesk: () => <p>Email preparado para revisão</p> }));
const quote = { reference: 'MP-0001-2026', client_name: 'Empresa ABC', final_price: '232', items: [] } as unknown as AdminQuote;
const data = { version: 2, published: true, registered: true, email: 'cliente@example.com', phone: '+258841234567', link: 'https://example.com/proposta#token=synthetic', decision: null };
const props = { quote, editable: true, onAcquire: vi.fn(), onChanged: vi.fn(), onBack: vi.fn(), onMessages: vi.fn() };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue(data); });
describe('Client proposal workspace', () => {
  it('keeps the proposal visible beside verified recipients and channel choices', async () => {
    render(<ClientProposalWorkspace {...props} />);
    expect(await screen.findByText('cliente@example.com')).toBeInTheDocument();
    expect(screen.getByText('Proposta em consulta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar email com PDF' })).toBeEnabled();
    expect(screen.getByText(/não envia nem anexa o documento automaticamente/)).toBeInTheDocument();
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
  });
  it('does not allow writes without an editing reservation', async () => {
    render(<ClientProposalWorkspace {...props} editable={false} />);
    await screen.findByText('cliente@example.com');
    expect(screen.getByRole('button', { name: 'Preparar email com PDF' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reservar edição para enviar / registar' }));
    expect(props.onAcquire).toHaveBeenCalled();
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
  });
  it('prepares a draft but never calls the actual email-send endpoint', async () => {
    render(<ClientProposalWorkspace {...props} />);
    await screen.findByText('cliente@example.com');
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({ conversation_id: 9 });
    fireEvent.click(screen.getByRole('button', { name: 'Preparar email com PDF' }));
    expect(await screen.findByText('Email preparado para revisão')).toBeInTheDocument();
    expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/quotes/MP-0001-2026/client-workspace/', expect.objectContaining({ method: 'POST' }));
    expect(vi.mocked(fetchWithAuth).mock.calls.some(([path]) => path.includes('email-send'))).toBe(false);
  });
  it('requires phone context and explicit confirmation before recording', async () => {
    render(<ClientProposalWorkspace {...props} />);
    await screen.findByText('cliente@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Registar decisão por telefone' }));
    expect(screen.getByRole('button', { name: 'Registar decisão do cliente' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome do contacto'), { target: { value: 'Dário' } });
    fireEvent.change(screen.getByLabelText('Contexto e confirmação obtida'), { target: { value: 'Confirmou por telefone às 10h' } });
    fireEvent.click(screen.getByRole('checkbox'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Registar decisão do cliente' }));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
    const call = vi.mocked(fetchWithAuth).mock.calls.at(-1);
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ action: 'phone', decision: 'accept', version: 2, contact_name: 'Dário', confirmed: true });
    vi.restoreAllMocks();
  });
});
