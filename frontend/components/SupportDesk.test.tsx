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
    if (path.endsWith('/read/') || path.endsWith('/resolve/')) return {};
    if (path.endsWith('/messages/')) return options?.method === 'POST' ? message : { results: [message], next: null };
    if (path.endsWith('/7/')) return thread;
    return options?.method === 'POST' ? thread : { results: [thread], next: null };
  });
}

describe('SupportDesk', () => {
  it('creates a contextual client conversation and keeps the first message', async () => {
    query = 'pedido=MP-0001-2026'; setup();
    render(<SupportDesk />);
    expect(screen.getByText('Sobre o pedido / projeto: MP-0001-2026')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Entrega' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Quando estará pronto?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/support-conversations/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ subject: 'Entrega', body: 'Quando estará pronto?', quote_reference: 'MP-0001-2026', order_reference: '' }) })));
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
