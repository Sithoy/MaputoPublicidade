import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { clearReceptionEdits, receptionEditHeaders } from '@/lib/reception-edit-session';
import { useReceptionEdit } from './useReceptionEdit';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchWithAuth).mockImplementation(async (_path, options) => options?.method === 'POST' && JSON.parse(options.body as string).action === 'acquire' ? {
    token: 'one-tab-token', session: { editor_id: 1, editor_name: 'Dário', expires_at: new Date(Date.now() + 300000).toISOString() },
  } : { session: null });
});
afterEach(() => { clearReceptionEdits(); vi.useRealTimers(); });
describe('Reception lease lifecycle', () => {
  it('opens read-only and reserves only on an explicit edit action', async () => {
    const { result, unmount } = renderHook(() => useReceptionEdit('MP-0001-2026', 'ORD-0001'));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    expect(result.current.editable).toBe(false);
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/reception/MP-0001-2026/edit-session/', {});
    await act(async () => { expect(await result.current.acquire()).toBe(true); });
    expect(result.current.editable).toBe(true);
    expect(receptionEditHeaders('/api/orders/ORD-0001/set-delivery/', 'POST')).toHaveProperty('X-Reception-Edit-Token');
    unmount();
    expect(receptionEditHeaders('/api/orders/ORD-0001/set-delivery/', 'POST')).toEqual({});
    expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/reception/MP-0001-2026/edit-session/', expect.objectContaining({ keepalive: true }));
  });
  it('pauses editing when renewal fails rather than retaining write access', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useReceptionEdit('MP-0001-2026', null));
    await act(async () => { await result.current.acquire(); });
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Lease lost'));
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(result.current.editable).toBe(false);
    expect(result.current.error).toContain('pausada');
    expect(receptionEditHeaders('/api/quotes/MP-0001-2026/', 'PATCH')).toEqual({});
  });
});
