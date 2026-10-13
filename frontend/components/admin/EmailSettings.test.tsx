import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { EmailSettings } from './EmailSettings';

const auth = vi.hoisted(() => ({ loading: false, allowed: true }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: auth.loading, can: () => auth.allowed }) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const config = { mailbox: 'atendimento@maputopublicidade.com', client_id: '1000.example', secret_configured: false, connected: false, tested_at: null, callback_url: 'https://example.test/callback/' };
beforeEach(() => { vi.clearAllMocks(); auth.loading = false; auth.allowed = true; vi.mocked(fetchWithAuth).mockResolvedValue(config); });

describe('Email settings', () => {
  it('offers a protected credential field, not active delivery claims', async () => {
    render(<EmailSettings />);
    expect(await screen.findByLabelText('Caixa dedicada')).toHaveValue(config.mailbox);
    expect(screen.getByLabelText('Client Secret')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Testar API Zoho' })).toBeDisabled();
    expect(screen.getByText(/sincronização com a caixa MP ainda não estão ativos/)).toBeInTheDocument();
  });
  it('clears the credential after saving and does not retain it in configuration', async () => {
    render(<EmailSettings />); await screen.findByLabelText('Caixa dedicada');
    const field = screen.getByLabelText('Client Secret');
    fireEvent.change(field, { target: { value: 'private-password' } });
    vi.mocked(fetchWithAuth).mockResolvedValue({ ...config, secret_configured: true });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ligação' }));
    await waitFor(() => expect(field).toHaveValue(''));
    expect(screen.getByRole('button', { name: 'Autorizar no Zoho' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Testar API Zoho' })).toBeDisabled();
    expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/integrations/email/oauth/', expect.objectContaining({ method: 'PATCH' }));
    expect(screen.queryByText('private-password')).not.toBeInTheDocument();
  });
  it('does not fetch while auth is loading or access is denied', () => {
    auth.loading = true;
    const view = render(<EmailSettings />);
    expect(fetchWithAuth).not.toHaveBeenCalled();
    auth.loading = false; auth.allowed = false; view.rerender(<EmailSettings />);
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
});
