import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientAreaLayout from './ClientAreaLayout';
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/area-cliente/orcamentos/MP-0001', useRouter: () => ({ push }) }));
vi.mock('@/hooks/useClientAuth', () => ({ useClientAuth: () => ({ user: { id: 12, email: 'client@example.test', first_name: 'Ana', profile: { company: 'Empresa de teste' } }, loading: false }) }));
vi.mock('@/hooks/useBrandDeskActivity', async () => ({ ...(await vi.importActual('@/hooks/useBrandDeskActivity')), useBrandDeskActivity: () => ({ approvals: 2, messages: 3 }) }));
vi.mock('@/components/PortalNotifications', () => ({ PortalNotifications: () => <span>Avisos</span> }));
vi.mock('@/lib/auth', () => ({ removeToken: vi.fn(), fetchWithAuth: vi.fn() }));

describe('BrandDesk premium workspace', () => {
  it('keeps the product identity, service company and client journey distinct', () => {
    render(<ClientAreaLayout><p>Conteúdo do cliente</p></ClientAreaLayout>);
    expect(screen.getByLabelText('BrandDesk by ETIOS')).toBeInTheDocument();
    expect(screen.getByText('Acompanhamento pela MP')).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Navegação do portal' }));
    expect(nav.getAllByRole('link').map((item) => item.textContent)).toEqual(['Novo pedido', 'Visão geral', 'Pedidos e propostas', 'Projetos e entregas', 'Aprovações2', 'Mensagens3', 'Faturas e pagamentos', 'Biblioteca da marca', 'Histórico de trabalhos', 'Perfil da empresa']);
    expect(nav.getByRole('link', { name: 'Pedidos e propostas' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });
  it('opens the mobile navigation and preserves logout behaviour', () => {
    render(<ClientAreaLayout><p>Conteúdo</p></ClientAreaLayout>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu do portal' }));
    expect(screen.getByRole('button', { name: 'Abrir menu do portal' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu do portal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Terminar sessão' }));
    expect(push).toHaveBeenCalledWith('/area-cliente/login');
  });
});
