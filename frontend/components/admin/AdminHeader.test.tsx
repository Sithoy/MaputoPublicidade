import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/api';
import { AdminHeader } from './AdminHeader';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/producao' }));
vi.mock('@/components/PortalNotifications', () => ({ PortalNotifications: () => <span>Avisos</span> }));

describe('Workdesk header', () => {
  it('keeps role identity and mobile navigation functional', () => {
    const open = vi.fn();
    const user = { id: 1, email: 'production@example.test', first_name: 'Dário', last_name: 'Nhaule', role: 'production' } as User;
    render(<AdminHeader user={user} onMenuOpen={open} />);
    expect(screen.getAllByText('Produção')).toHaveLength(2); // page title and assigned role
    expect(screen.getByText('Dário Nhaule')).toBeInTheDocument();
    expect(screen.getByText('DN')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de administração' }));
    expect(open).toHaveBeenCalledOnce();
  });
});
