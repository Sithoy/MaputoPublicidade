import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrandDeskActivity } from './useBrandDeskActivity';
import { getClientQuotes } from '@/lib/client-api';
import { fetchWithAuth } from '@/lib/auth';
vi.mock('@/lib/client-api', () => ({ getClientQuotes: vi.fn() }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));

describe('BrandDesk activity badges', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('does not fetch on public/authentication pages', () => {
    renderHook(() => useBrandDeskActivity(undefined, '/area-cliente/login'));
    expect(getClientQuotes).not.toHaveBeenCalled();
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
  it('counts all inbox pages and both kinds of approvals', async () => {
    vi.mocked(getClientQuotes).mockResolvedValue([{ status: 'quoted', artwork: { status: 'pending' } }] as never);
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({ results: [{ unread_count: 2 }], next: 'https://backend.example/api/support-conversations/?page=2' }).mockResolvedValueOnce({ results: [{ unread_count: 3 }], next: null });
    const { result } = renderHook(() => useBrandDeskActivity(12, '/area-cliente'));
    await waitFor(() => expect(result.current).toEqual({ approvals: 2, messages: 5 }));
    expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/support-conversations/?page=2', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
  it('does not show partial or failed inbox counts as zero', async () => {
    vi.mocked(getClientQuotes).mockRejectedValue(new Error('offline'));
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({ results: [{ unread_count: 2 }], next: 'https://untrusted.example/api/secrets/' });
    const { result } = renderHook(() => useBrandDeskActivity(12, '/area-cliente'));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
    expect(result.current).toEqual({ approvals: null, messages: null });
  });
});
