import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { WhatsAppSettings } from './WhatsAppSettings';

let allowed = true;
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => allowed }) }));
const config = {
  mode: 'coexistence', enabled: false,
  credential_status: { access_token: false, app_secret: false, verify_token: false },
  missing_fields: ['access_token'], webhook_url: 'https://backend.example/api/integrations/whatsapp/webhook/',
  tested_at: null, webhook_verified_at: null, last_received_at: null,
};
beforeEach(() => { allowed = true; vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue(config); });

describe('WhatsAppSettings', () => {
  it('denies configuration access without fetching private settings', () => {
    allowed = false;
    render(<WhatsAppSettings />);
    expect(screen.getByRole('alert')).toHaveTextContent('não permite gerir integrações');
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });

  it('blocks activation and testing until configuration is ready', async () => {
    render(<WhatsAppSettings />);
    expect(await screen.findByLabelText('Ativar mensagens WhatsApp no inbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Testar ligação Meta' })).toBeDisabled();
    expect(screen.getByLabelText('Callback URL para a Meta')).toHaveValue(config.webhook_url);
    expect(screen.getByRole('checkbox', { name: /onboarding Coexistence/ })).toBeInTheDocument();
  });

  it('sends credentials only on explicit save and clears them afterwards', async () => {
    render(<WhatsAppSettings />);
    const input = await screen.findByLabelText(/Token de acesso/);
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.change(input, { target: { value: 'private-test-token' } });
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuração' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/integrations/whatsapp/', expect.objectContaining({ method: 'PATCH' })));
    const options = vi.mocked(fetchWithAuth).mock.calls[1][1];
    expect(JSON.parse(options?.body as string)).toMatchObject({ access_token: 'private-test-token', enabled: false });
    await waitFor(() => expect(input).toHaveValue(''));
    expect(screen.getByRole('status')).toHaveTextContent('Configuração guardada');
  });

  it('requires saving activation even after a successful connection and verification', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ ...config, missing_fields: [], tested_at: '2026-10-11', webhook_verified_at: '2026-10-11' });
    render(<WhatsAppSettings />);
    const activation = await screen.findByLabelText('Ativar mensagens WhatsApp no inbox');
    expect(activation).toBeEnabled();
    fireEvent.click(activation);
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Guardar configuração' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Testar ligação Meta' })).toBeDisabled();
  });
});
