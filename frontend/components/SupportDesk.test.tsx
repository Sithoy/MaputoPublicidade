import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { SupportDesk } from './SupportDesk';

let query = '';
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }));
afterEach(() => { vi.clearAllMocks(); query = ''; });

const thread = { id: 7, subject: 'Entrega', client_name: 'Empresa ABC', status: 'awaiting_team', unread_count: 1, quote_reference: 'MP-0001-2026', order_reference: '' };
const message = { id: 9, body: 'Quando estará pronto?', is_staff: false, created_at: '2026-10-10T10:00:00Z' };
function setup() {
  vi.mocked(fetchWithAuth).mockImplementation(async (path, options) => {
    if (path.includes('/contexts/')) return { results: [{ kind: 'quote', reference: 'MP-0001-2026', title: 'Campanha', status: 'Em análise', available: true }], next: null };
    if (path.endsWith('/read/') || path.endsWith('/resolve/')) return {};
    if (path.endsWith('/messages/')) return options?.method === 'POST' ? message : { results: [message], next: null };
    if (path.endsWith('/7/')) return thread;
    return options?.method === 'POST' ? thread : { results: [thread], next: null };
  });
}

describe('SupportDesk', () => {
  it('blocks WhatsApp API text outside the window and offers the phone in Coexistence', async () => {
    query = 'conversa=7';
    const whatsapp = { ...thread, channel: 'whatsapp', whatsapp: { phone: '258849999999', can_reply: false, coexistence: true } };
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => {
      if (path.endsWith('/7/')) return whatsapp;
      if (path.endsWith('/read/')) return {};
      return { results: path.endsWith('/messages/') ? [message] : [whatsapp], next: null };
    });
    render(<SupportDesk staff />);
    expect(await screen.findByText(/janela de 24 horas terminou/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir conversa no WhatsApp Business/ })).toHaveAttribute('href', 'https://wa.me/258849999999');
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Resposta' } });
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
  });

  it('shows an uncertain WhatsApp send without losing the draft or automatically retrying', async () => {
    query = 'conversa=7';
    const whatsapp = { ...thread, channel: 'whatsapp', whatsapp: { phone: '258849999999', can_reply: true, coexistence: true } };
    let failed = false;
    vi.mocked(fetchWithAuth).mockImplementation(async (path, options) => {
      if (path.endsWith('/7/')) return whatsapp;
      if (path.endsWith('/read/')) return {};
      if (path.endsWith('/messages/')) {
        if (options?.method === 'POST') { failed = true; throw new Error('Verifique no telefone antes de reenviar'); }
        return { results: failed ? [{ ...message, is_staff: true, delivery_status: 'unconfirmed', source: 'whatsapp_api' }] : [message], next: null };
      }
      return { results: [whatsapp], next: null };
    });
    render(<SupportDesk staff />);
    await screen.findByText('Quando estará pronto?');
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Vamos responder' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Verifique no telefone antes de reenviar');
    expect(screen.getByLabelText('Mensagem')).toHaveValue('Vamos responder');
    expect(screen.getByText(/Envio não confirmado/)).toBeInTheDocument();
    expect(vi.mocked(fetchWithAuth).mock.calls.filter(([, options]) => options?.method === 'POST' && options?.body?.toString().includes('Vamos responder'))).toHaveLength(1);
  });

  it('selects an invoice and sends only that context', async () => {
    setup();
    vi.mocked(fetchWithAuth).mockImplementation(async (path, options) => {
      if (path.includes('/contexts/')) return { results: [{ kind: 'invoice', reference: 'FT-2026-0001', title: 'ABC', status: 'Emitida', available: true }], next: null };
      return options?.method === 'POST' ? thread : { results: [], next: null };
    });
    render(<SupportDesk />);
    fireEvent.change(screen.getByLabelText('Relacionar com…'), { target: { value: 'invoice' } });
    await screen.findByRole('option', { name: /FT-2026-0001/ });
    fireEvent.change(screen.getByLabelText('Escolher registo'), { target: { value: 'FT-2026-0001' } });
    expect(screen.getByRole('link', { name: 'Abrir fatura' })).toHaveAttribute('href', '/area-cliente/faturas/FT-2026-0001');
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Pagamento' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Confirmar pagamento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/support-conversations/', expect.objectContaining({ body: JSON.stringify({ subject: 'Pagamento', body: 'Confirmar pagamento', quote_reference: '', order_reference: '', invoice_reference: 'FT-2026-0001' }) })));
  });

  it('blocks an unavailable deep link and permits switching to general', async () => {
    query = 'fatura=PRIVATE';
    vi.mocked(fetchWithAuth).mockResolvedValue({ results: [], next: null });
    render(<SupportDesk />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Este registo não está disponível');
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Ajuda' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Questão geral' } });
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Relacionar com…'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled();
  });

  it('does not show an invoice link to staff without access', async () => {
    query = 'conversa=7'; setup();
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => {
      if (path.endsWith('/7/')) return { ...thread, quote_reference: '', context: { kind: 'invoice', available: false } };
      return { results: [], next: null };
    });
    render(<SupportDesk staff />);
    expect(await screen.findByText('Este registo não está disponível para a sua conta ou função.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Abrir fatura' })).not.toBeInTheDocument();
  });
  it('creates a contextual client conversation and keeps the first message', async () => {
    query = 'pedido=MP-0001-2026'; setup();
    render(<SupportDesk />);
    expect(await screen.findByText('MP-0001-2026 · Campanha')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Entrega' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Quando estará pronto?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/support-conversations/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ subject: 'Entrega', body: 'Quando estará pronto?', quote_reference: 'MP-0001-2026', order_reference: '', invoice_reference: '' }) })));
    expect(await screen.findByText('Quando estará pronto?')).toBeInTheDocument();
  });

  it('opens the staff inbox and replies on the selected conversation', async () => {
    query = 'conversa=7'; setup();
    render(<SupportDesk staff />);
    expect(await screen.findByText('Quando estará pronto?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova conversa' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver pedido/ })).toHaveAttribute('href', '/admin/orcamentos/MP-0001-2026');
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Amanhã.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/support-conversations/7/messages/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ body: 'Amanhã.' }) })));
  });

  it('retains the message when sending fails', async () => {
    setup();
    vi.mocked(fetchWithAuth).mockImplementation(async (_path, options) => {
      if (options?.method === 'POST') throw new Error('Offline');
      return { results: [], next: null };
    });
    render(<SupportDesk />);
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Ajuda' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Tenho uma dúvida.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar');
    expect(screen.getByLabelText('Mensagem')).toHaveValue('Tenho uma dúvida.');
  });
});
