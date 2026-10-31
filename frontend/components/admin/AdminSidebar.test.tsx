import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from './AdminSidebar';
import type { User } from '@/lib/api';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/entregas', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({ default: () => <span>MP</span> }));
vi.mock('@/lib/auth', () => ({ logout: vi.fn() }));
describe('Consolidated admin menu', () => {
  it('separates operational workspaces from records and correspondence', () => {
    render(<AdminSidebar user={{ is_staff: true, is_superuser: true } as User} />);
    expect(screen.getAllByRole('link').slice(1, 5).map((link) => link.textContent)).toEqual(['Recepção', 'Studio · Artes', 'Produção', 'Entregas']);
    expect(screen.getByRole('link', { name: 'Entregas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Propostas' })).toHaveAttribute('href', '/admin/propostas');
    expect(screen.getByText('Consulta e registos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Caixa de entrada' })).toBeInTheDocument();
    expect(screen.queryByText('Operação · Produção')).not.toBeInTheDocument();
    expect(screen.queryByText('Produção e entregas')).not.toBeInTheDocument();
    expect(screen.queryByText('Pipeline de trabalhos')).not.toBeInTheDocument();
  });
  it('does not expose financial or commercial registers to production', () => {
    render(<AdminSidebar user={{ is_staff: true, role: 'production', capabilities: ['production.view', 'quotes.artwork', 'orders.view', 'orders.manage_delivery'] } as User} />);
    expect(screen.getByRole('link', { name: 'Entregas' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Propostas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Encomendas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Faturas' })).not.toBeInTheDocument();
  });
});
