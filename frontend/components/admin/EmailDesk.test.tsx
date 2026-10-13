import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { EmailDesk } from './EmailDesk';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const thread = { id: 7, channel: 'email', subject: 'Pedido de materiais', client_name: 'Empresa ABC', email_stage: 'new', unread_count: 1, updated_at: '2026-10-13T10:00:00Z', email: { address: 'client@example.com', can_reply: true }, context: null };
const original = { subject: 'Re: Pedido de materiais', body: '', template_key: '', version: 0, send_state: 'idle', updated_by: null as string | null, updated_at: '2026-10-13T10:00:00Z' };
let stored = { ...original };
beforeEach(() => {
  stored = { ...original }; vi.clearAllMocks();
  vi.mocked(fetchWithAuth).mockImplementation(async (path, options) => {
    const data = options?.body ? JSON.parse(String(options.body)) : {};
    if (path.endsWith('/sync/')) return { active: true, imported: 0, more: false };
    if (path.endsWith('/email-models/')) return { models: [{ key: 'received', name: 'Receção do pedido', subject: 'Recebemos o pedido MP-0001-2026', body: 'Olá. Obrigado pelo seu pedido.', missing: [] }] };
    if (path.endsWith('/email-draft/')) { if (options?.method === 'PATCH') stored = { ...stored, ...data, version: stored.version + 1, updated_by: 'Recepção MP' }; return { ...stored }; }
    if (path.endsWith('/email-preview/')) return { html: '<p>Pré-visualização segura</p>', hash: 'reviewed-hash', missing: [] };
    if (path.endsWith('/email-send/')) { stored = { ...stored, body: '', version: stored.version + 1 }; return { draft: { ...stored }, detail: 'Email aceite pelo Zoho.' }; }
    if (path.endsWith('/read/')) return {};
    if (path.endsWith('/messages/')) return { results: [{ id: 9, body: '<script>Conteúdo externo</script>', is_staff: false, email_subject: thread.subject, created_at: thread.updated_at, delivery_status: 'received', email_headers: { from: thread.email.address, to: 'atendimento@maputopublicidade.com' } }], next: null };
    if (path.endsWith('/7/')) return thread;
    return { results: [thread], count: 1, next: null };
  });
});
afterEach(() => vi.restoreAllMocks());

describe('Email workdesk', () => {
  it('lists only emails and presents correspondence as documents, not chat bubbles', async () => {
    render(<EmailDesk initialConversation={7} />);
    expect(await screen.findByLabelText('Texto do email')).toBeInTheDocument();
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/support-conversations/?channel_group=email');
    expect(screen.getByRole('region', { name: 'Histórico de emails' })).toBeInTheDocument();
    expect(screen.getByText('<script>Conteúdo externo</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
  it('applying a model only edits a draft and never sends automatically', async () => {
    render(<EmailDesk initialConversation={7} />);
    await screen.findByLabelText('Texto do email');
    fireEvent.change(screen.getByLabelText('Modelo de email'), { target: { value: 'received' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar modelo' }));
    expect(screen.getByLabelText('Texto do email')).toHaveValue('Olá. Obrigado pelo seu pedido.');
    expect(screen.getByRole('button', { name: 'Pré-visualizar email' })).toBeDisabled();
    expect(vi.mocked(fetchWithAuth).mock.calls.some(([path]) => path.endsWith('/email-send/'))).toBe(false);
  });
  it('requires saving, preview and human confirmation before a reviewed send', async () => {
    render(<EmailDesk initialConversation={7} />);
    await screen.findByLabelText('Texto do email');
    fireEvent.change(screen.getByLabelText('Texto do email'), { target: { value: 'Uma resposta estruturada.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar rascunho' }));
    await screen.findByText('Rascunho guardado na caixa partilhada.');
    expect(vi.mocked(fetchWithAuth).mock.calls.some(([path]) => path.endsWith('/email-send/'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar email' }));
    const frame = await screen.findByTitle('Pré-visualização do email');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(screen.getByRole('button', { name: 'Enviar email revisto' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Revi o destinatário/));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar email revisto' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/support-conversations/7/email-send/', expect.objectContaining({ body: JSON.stringify({ version: 1, preview_hash: 'reviewed-hash', confirmed: true }) })));
  });
  it('does not discard an unsaved draft when switching is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const previous = vi.mocked(fetchWithAuth).getMockImplementation()!;
    vi.mocked(fetchWithAuth).mockImplementation(async (path, options) => path.includes('?channel_group=email') ? { results: [thread, { ...thread, id: 8, client_name: 'Outra empresa' }], count: 2, next: null } : previous(path, options));
    render(<EmailDesk initialConversation={7} />);
    await screen.findByLabelText('Texto do email');
    fireEvent.change(screen.getByLabelText('Texto do email'), { target: { value: 'Rascunho importante' } });
    fireEvent.click(screen.getByRole('button', { name: /Outra empresa/ }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Texto do email')).toHaveValue('Rascunho importante');
    expect(vi.mocked(fetchWithAuth).mock.calls.some(([path]) => path.includes('/8/'))).toBe(false);
  });
  it('locks uncertain sends and requires manual verification before recovery', async () => {
    stored = { ...stored, body: 'Preservado', send_state: 'unconfirmed', version: 1 };
    render(<EmailDesk initialConversation={7} />);
    expect(await screen.findByText('Envio não confirmado')).toBeInTheDocument();
    expect(screen.getByLabelText('Texto do email')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Registar verificação' })).toBeDisabled();
    expect(vi.mocked(fetchWithAuth).mock.calls.some(([path]) => path.endsWith('/email-send/'))).toBe(false);
  });
  it('preserves local edits after a shared draft conflict until reload is confirmed', async () => {
    const previous = vi.mocked(fetchWithAuth).getMockImplementation()!;
    vi.mocked(fetchWithAuth).mockImplementation(async (path, options) => {
      if (path.endsWith('/email-draft/') && options?.method === 'PATCH') {
        stored = { ...stored, body: 'Resposta da colega', version: 2 };
        throw new Error('O rascunho foi alterado por outra pessoa.');
      }
      return previous(path, options);
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EmailDesk initialConversation={7} />);
    await screen.findByLabelText('Texto do email');
    fireEvent.change(screen.getByLabelText('Texto do email'), { target: { value: 'Resposta local' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar rascunho' }));
    const reload = await screen.findByRole('button', { name: 'Recarregar rascunho partilhado' });
    fireEvent.click(reload);
    expect(screen.getByLabelText('Texto do email')).toHaveValue('Resposta local');
    confirm.mockReturnValue(true);
    fireEvent.click(reload);
    await waitFor(() => expect(screen.getByLabelText('Texto do email')).toHaveValue('Resposta da colega'));
  });
});
