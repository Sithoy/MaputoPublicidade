import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBlobWithAuth, fetchWithAuth, getToken, removeToken, setRefreshToken, setToken } from './auth';

const request = vi.fn();
beforeEach(() => { removeToken(); request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { removeToken(); vi.unstubAllGlobals(); });

describe('authenticated image bytes', () => {
  it.each(['https://evil.test/api/file', '//evil.test/api/file', '/api/%2e%2e/outside'])('never sends a bearer token outside the local API: %s', async (path) => {
    setToken('test-access');
    await expect(fetchBlobWithAuth(path)).rejects.toThrow('Invalid authenticated API path');
    await expect(fetchWithAuth(path)).rejects.toThrow('Invalid authenticated API path');
    expect(request).not.toHaveBeenCalled();
    expect(getToken()).toBe('test-access');
  });
  it('does not follow a redirect when retrieving private file bytes', async () => {
    setToken('test-access');
    request.mockResolvedValue({ status: 302, ok: false });
    await expect(fetchBlobWithAuth('/api/image', { redirect: 'follow' })).rejects.toThrow('302');
    expect(request.mock.calls[0][1].redirect).toBe('error');
    expect(getToken()).toBe('test-access');
  });
  it('uses the auth header and abort signal, without putting credentials in the URL', async () => {
    setToken('test-access');
    const blob = new Blob(['image'], { type: 'image/png' });
    request.mockResolvedValue({ status: 200, ok: true, blob: async () => blob });
    const controller = new AbortController();
    expect(await fetchBlobWithAuth('/api/quotes/MP-1/attachment/?id=1&preview=1', { signal: controller.signal })).toBe(blob);
    const [path, options] = request.mock.calls[0];
    expect(path).not.toContain('test-access');
    expect(options).toMatchObject({ cache: 'no-store', signal: controller.signal, headers: { Authorization: 'Bearer test-access' } });
  });

  it('refreshes expired authentication before retrying the image', async () => {
    setToken('test-old'); setRefreshToken('test-refresh');
    request.mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce(new Response(JSON.stringify({ meta: { access_token: 'test-renewed' } }), { headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce({ status: 200, ok: true, blob: async () => new Blob(['image']) });
    await fetchBlobWithAuth('/api/image');
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls[2][1].headers.Authorization).toBe('Bearer test-renewed');
  });

  it('rejects denied access and clears an expired session', async () => {
    setToken('test-access');
    request.mockResolvedValue({ status: 401, ok: false });
    await expect(fetchBlobWithAuth('/api/image')).rejects.toThrow('401');
    expect(getToken()).toBeNull();
  });
});
