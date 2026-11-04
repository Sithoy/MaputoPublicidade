import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useClientAuth } from './useClientAuth';
import { fetchSession, getToken } from '@/lib/auth';

const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/auth', () => ({ fetchSession: vi.fn(), getToken: vi.fn(), removeToken: vi.fn(), SessionError: class extends Error {} }));
beforeEach(() => { vi.clearAllMocks(); window.history.replaceState({}, '', '/area-cliente/orcamentos/MP-0001-2026#arte'); });
it('preserves the artwork review through login without carrying a private token', async () => {
  vi.mocked(getToken).mockReturnValue(null);
  renderHook(() => useClientAuth());
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/area-cliente/login?next=%2Farea-cliente%2Forcamentos%2FMP-0001-2026%23arte'));
  expect(fetchSession).not.toHaveBeenCalled();
});
it('never preserves token-bearing URLs through login', async () => {
  window.history.replaceState({}, '', '/area-cliente/orcamentos/MP-0001-2026#token=synthetic-private-link');
  vi.mocked(getToken).mockReturnValue(null);
  renderHook(() => useClientAuth());
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/area-cliente/login'));
});
