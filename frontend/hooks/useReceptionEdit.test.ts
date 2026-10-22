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
  it('releases on page exit with the exact reservation header', async () => {
    const { result } = renderHook(() => useReceptionEdit('MP-0001-2026', null));
    await act(async () => { await result.current.acquire(); });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/reception/MP-0001-2026/edit-session/', expect.objectContaining({
      keepalive: true, headers: expect.objectContaining({ 'X-Reception-Edit-Token': 'one-tab-token' }),
      body: JSON.stringify({ action: 'release' }),
    }));
    expect(result.current.editable).toBe(false);
  });

  it('does not clear a new reservation when an older release finishes late', async () => {
    const { result, rerender } = renderHook(({ ref }) => useReceptionEdit(ref, null), { initialProps: { ref: 'MP-0001-2026' } });
    await act(async () => { await result.current.acquire(); });
    let finishRelease!: (value: unknown) => void;
    const delayed = new Promise((resolve) => { finishRelease = resolve; });
    vi.mocked(fetchWithAuth).mockImplementation(async (_path, options) => {
      const action = options?.body ? JSON.parse(options.body as string).action : '';
      if (action === 'release') return delayed;
      if (action === 'acquire') return { token: 'new-reservation', session: { editor_id: 1, editor_name: 'Dário', expires_at: new Date(Date.now() + 300000).toISOString() } };
      return { session: null };
    });
    let released!: Promise<void>;
    act(() => { released = result.current.release(); });
    rerender({ ref: 'MP-0002-2026' });
    await act(async () => { await result.current.acquire(); });
    await act(async () => { finishRelease({ session: null }); await released; });
    expect(result.current.editable).toBe(true);
    expect(receptionEditHeaders('/api/quotes/MP-0002-2026/', 'PATCH')).toHaveProperty('X-Reception-Edit-Token', 'new-reservation');
  });

  it('uses an explicit resume command rather than a supervisor takeover', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ token: 'resumed-session', session: { editor_id: 1, editor_name: 'Dário', expires_at: new Date(Date.now() + 300000).toISOString() } });
    const { result } = renderHook(() => useReceptionEdit('MP-0001-2026', null));
    await act(async () => { await result.current.acquire('', true); });
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/reception/MP-0001-2026/edit-session/', expect.objectContaining({ body: JSON.stringify({ action: 'resume' }) }));
  });
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
