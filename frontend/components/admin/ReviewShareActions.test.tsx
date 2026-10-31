import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { ReviewShareActions } from './ReviewShareActions';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const fresh = { expired: false, message: 'Olá Ana\n*Arte · MP-0001-2026*\nTrabalho: 200 polos\nhttps://example.com/review', link: 'https://example.com/review', expires_at: '2050-11-01T12:00:00Z', whatsapp_number: '258841234567' };
const endpoint = '/api/production/MP-0001-2026/share/1/';
const writeText = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  vi.mocked(fetchWithAuth).mockResolvedValue(fresh);
});

describe('Validated review sharing', () => {
  it('checks the server on every copy and blocks stale links after the panel is left open', async () => {
    render(<ReviewShareActions endpoint={endpoint} version={1} />);
    fireEvent.click(screen.getByText('Copiar mensagem'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(fresh.message));
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({ expired: true, detail: 'Link expirado' });
    fireEvent.click(screen.getByText('Copiar mensagem'));
    expect(await screen.findByText('Link expirado')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText('Mensagem de WhatsApp')).not.toBeInTheDocument();
  });
  it('requires explicit confirmation before renewing artwork', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({ expired: true, detail: 'Link expirado' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ReviewShareActions endpoint={endpoint} version={1} />);
    fireEvent.click(screen.getByText('Validar e preparar mensagem'));
    fireEvent.click(await screen.findByText('Gerar novo link e preparar mensagem'));
    await screen.findByLabelText('Mensagem de WhatsApp');
    expect(confirm).toHaveBeenCalledOnce();
    expect(JSON.parse(String(vi.mocked(fetchWithAuth).mock.calls.at(-1)?.[1]?.body))).toEqual({ renew: true });
    confirm.mockRestore();
  });
  it('navigates to WhatsApp only after successful validation and never registers a send', async () => {
    const tab = { opener: 'parent', location: { href: '' }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    render(<ReviewShareActions endpoint="/api/quotes/MP-0001-2026/client-workspace/" version={2} proposal />);
    fireEvent.click(screen.getByText('Abrir WhatsApp'));
    await waitFor(() => expect(tab.location.href).toContain('https://wa.me/258841234567'));
    expect(tab.opener).toBeNull();
    expect(JSON.parse(String(vi.mocked(fetchWithAuth).mock.calls[0][1]?.body))).toEqual({ action: 'prepare_share', version: 2 });
    open.mockRestore();
  });
  it('does not expose a clickable WhatsApp link or copy anything on API failure', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('A versão mudou'));
    render(<ReviewShareActions endpoint={endpoint} version={1} />);
    fireEvent.click(screen.getByText('Copiar link privado'));
    expect(await screen.findByRole('alert')).toHaveTextContent('A versão mudou');
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
