import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortalNotifications } from './PortalNotifications';
import { fetchWithAuth } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/area-cliente' }));

afterEach(() => vi.clearAllMocks());

describe('PortalNotifications', () => {
  it('shows private notices and marks all as read through the API', async () => {
    let read = false;
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => {
      if (path.endsWith('/read_all/')) { read = true; return {}; }
      if (path.endsWith('/unread_count/')) return { count: read ? 0 : 1 };
      return { results: [{ id: 1, title: 'MP-0001: Arte enviada', href: '/area-cliente/orcamentos/MP-0001', read_at: read ? '2026-10-10T10:00:00Z' : null, created_at: '2026-10-10T09:00:00Z' }] };
    });
    render(<PortalNotifications userId={1} />);
    const link = await screen.findByRole('link', { name: /MP-0001: Arte enviada/ });
    expect(link).toHaveAttribute('href', '/area-cliente/orcamentos/MP-0001');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/notifications/read_all/', { method: 'POST' }));
    await waitFor(() => expect(screen.getByLabelText('Notificações: 0 não lidas')).toBeInTheDocument());
  });
});
