import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { SettingsWorkspace } from './SettingsWorkspace';

const auth = vi.hoisted(() => ({ loading: false, allowed: true, users: true }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: auth.loading, can: (key: string) => key === 'users.manage' ? auth.users : auth.allowed }) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const email = { mailbox: 'atendimento@maputopublicidade.com', display_name: 'Atendimento MP', smtp_host: 'smtppro.zoho.com', imap_host: 'imappro.zoho.com', password_configured: false, tested_at: null };
const whatsapp = { enabled: false, tested_at: null, missing_fields: ['app_id'], credential_status: { access_token: false, app_secret: false, verify_token: false }, webhook_url: 'https://example.test/webhook/', webhook_verified_at: null, last_received_at: null };
beforeEach(() => {
  vi.clearAllMocks(); auth.loading = false; auth.allowed = true; auth.users = true;
  window.history.replaceState(null, '', '/admin/definicoes');
  vi.mocked(fetchWithAuth).mockImplementation(async (path) => path.includes('email') ? email : whatsapp);
});
afterEach(() => vi.restoreAllMocks());

describe('Settings workspace', () => {
  it('starts with an overview and separate functional areas', async () => {
    render(<SettingsWorkspace />);
    expect(screen.getByRole('heading', { name: 'Definições', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Áreas de Definições' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Por configurar')).toHaveLength(2));
    expect(screen.queryByLabelText('Credencial da caixa / palavra-passe de aplicação')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Empresa', exact: true }));
    expect(screen.getByRole('region', { name: 'Dados da empresa' })).toBeInTheDocument();
    expect(screen.getByText(/A edição destes dados continua na configuração técnica/)).toBeInTheDocument();
    expect(window.location.hash).toBe('#company');
  });
  it('preserves email drafts when switching is declined and discards only after confirmation', async () => {
    render(<SettingsWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Email', exact: true }));
    const field = await screen.findByLabelText('Credencial da caixa / palavra-passe de aplicação');
    fireEvent.change(field, { target: { value: 'private-draft' } });
    await screen.findByText('Alterações por guardar');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp', exact: true }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(field).toHaveValue('private-draft');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp', exact: true }));
    expect(await screen.findByLabelText('Nome da empresa')).toBeInTheDocument();
    expect(screen.queryByLabelText('Credencial da caixa / palavra-passe de aplicação')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
  it('supports direct email links and does not duplicate user management', async () => {
    window.history.replaceState(null, '', '/admin/definicoes#email');
    render(<SettingsWorkspace />);
    expect(await screen.findByLabelText('Caixa dedicada')).toHaveValue(email.mailbox);
    fireEvent.click(screen.getByRole('button', { name: 'Equipa e acessos', exact: true }));
    expect(screen.getByRole('link', { name: 'Gerir equipa e acessos' })).toHaveAttribute('href', '/admin/utilizadores');
  });
  it('keeps unavailable state distinct from an unconfigured channel', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Unavailable'));
    render(<SettingsWorkspace />);
    await waitFor(() => expect(screen.getAllByText('Estado indisponível')).toHaveLength(2));
    expect(screen.queryByText('Por configurar')).not.toBeInTheDocument();
  });
  it('does not fetch for unauthenticated or unauthorized roles', () => {
    auth.loading = true; const view = render(<SettingsWorkspace />);
    expect(fetchWithAuth).not.toHaveBeenCalled();
    auth.loading = false; auth.allowed = false; view.rerender(<SettingsWorkspace />);
    expect(screen.getByRole('alert')).toHaveTextContent('não permite');
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
  it('hides user-management actions from roles without that permission', () => {
    auth.users = false; render(<SettingsWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Equipa e acessos', exact: true }));
    expect(screen.queryByRole('link', { name: 'Gerir equipa e acessos' })).not.toBeInTheDocument();
    expect(screen.getByText('A sua função não permite gerir utilizadores.')).toBeInTheDocument();
  });
});
