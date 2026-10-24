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
  it('keeps its contextual action but does not repeat the shared identity header when embedded', async () => {
    render(<ClientProposalWorkspace {...props} embedded />);
    await screen.findByText('cliente@example.com');
    expect(screen.queryByRole('heading', { name: 'Da proposta à decisão.' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Próxima ação do cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar email com PDF' })).toBeEnabled();
  });
  it('keeps channel status and decision provenance in Summary, not the operational stage', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ ...data, state: 'not_sent', channels: {
      branddesk: { state: 'available' }, email: { state: 'draft' }, whatsapp: { state: 'not_sent' },
    } });
    const view = render(<ClientProposalWorkspace {...props} />);
    await screen.findByRole('heading', { name: 'Enviar a proposta' });
    expect(screen.queryByRole('definition')).not.toBeInTheDocument();
    expect(screen.queryByText('Rascunho — ainda não enviado')).not.toBeInTheDocument();
    expect(screen.queryByText('Proposta em consulta')).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Agendar seguimento' })).not.toBeInTheDocument();
    view.rerender(<ClientProposalWorkspace {...props} summary />);
    expect(await screen.findByText('Rascunho — ainda não enviado')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Resumo da decisão' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preparar email com PDF' })).not.toBeInTheDocument();
  });

  it('prioritises contact after sending and opens follow-ups on demand', async () => {
    const onFollowUps = vi.fn();
    vi.mocked(fetchWithAuth).mockResolvedValue({ ...data, state: 'awaiting_response' });
    render(<ClientProposalWorkspace {...props} onFollowUps={onFollowUps} />);
    expect(await screen.findByRole('heading', { name: 'Obter a decisão do cliente' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ligar/ })).toHaveAttribute('href', 'tel:+258841234567');
    fireEvent.click(screen.getByRole('button', { name: 'Agendar próximo contacto' }));
    expect(onFollowUps).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Já tenho a decisão' }));
    expect(screen.getByLabelText('Nome do contacto')).toBeInTheDocument();
  });

  it('only records WhatsApp as sent after staff explicitly confirms the PDF and link', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ ...data, whatsapp_number: '258841234567' });
    render(<ClientProposalWorkspace {...props} />);
    await screen.findByText('cliente@example.com');
    fireEvent.click(screen.getByText('Preparar WhatsApp'));
    expect(screen.getByRole('link', { name: 'Abrir WhatsApp' }).getAttribute('href')).toContain('wa.me/258841234567');
    expect(vi.mocked(fetchWithAuth).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Registo do envio'), { target: { value: 'PDF e link enviados às compras' } });
    fireEvent.click(screen.getByLabelText(/Confirmo que enviei a mensagem/));
    fireEvent.click(screen.getByRole('button', { name: 'Registar envio por WhatsApp' }));
    await waitFor(() => expect(vi.mocked(fetchWithAuth).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true));
    expect(props.onChanged).not.toHaveBeenCalled();
    const writes = vi.mocked(fetchWithAuth).mock.calls.filter(([, options]) => options?.method === 'POST');
    expect(JSON.parse(String(writes[0][1]?.body))).toMatchObject({ action: 'whatsapp', version: 2, confirmed: true, comment: 'PDF e link enviados às compras' });
  });

  it('keeps the stage focused on sending without repeating the proposal document', async () => {
    render(<ClientProposalWorkspace {...props} />);
    expect(await screen.findByText('cliente@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Proposta em consulta')).not.toBeInTheDocument();
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
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/quotes/MP-0001-2026/client-workspace/', expect.objectContaining({ method: 'POST' }));
    expect(vi.mocked(fetchWithAuth).mock.calls.some(([path]) => path.includes('email-send'))).toBe(false);
  });
  it('requires phone context and explicit confirmation before recording', async () => {
    render(<ClientProposalWorkspace {...props} />);
    await screen.findByText('cliente@example.com');
    fireEvent.click(screen.getByRole('button', { name: /Registar decisão Confirmação por telefone/ }));
    expect(screen.getByRole('button', { name: 'Registar decisão do cliente' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome do contacto'), { target: { value: 'Dário' } });
    fireEvent.change(screen.getByLabelText('Contexto e confirmação obtida'), { target: { value: 'Confirmou por telefone às 10h' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que este contacto comunicou/ }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Registar decisão do cliente' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('autorizar a operação'));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
    const call = vi.mocked(fetchWithAuth).mock.calls.find(([, options]) => options?.method === 'POST');
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ action: 'phone', decision: 'accept', version: 2, contact_name: 'Dário', confirmed: true });
    vi.restoreAllMocks();
  });
  it('protects a decision draft when switching operational actions', async () => {
    const onDirtyChange = vi.fn();
    render(<ClientProposalWorkspace {...props} onDirtyChange={onDirtyChange} />);
    await screen.findByText('cliente@example.com');
    fireEvent.click(screen.getByRole('button', { name: /Registar decisão Confirmação/ }));
    fireEvent.change(screen.getByLabelText('Nome do contacto'), { target: { value: 'Contacto por confirmar' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: /Enviar proposta PDF/ }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText('Nome do contacto')).toHaveValue('Contacto por confirmar');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    confirm.mockRestore();
  });
});
