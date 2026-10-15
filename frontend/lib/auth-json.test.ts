import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth, removeToken, setRefreshToken, setToken } from './auth';
import { deleteBrandAsset } from './client-api';

const request = vi.fn();
beforeEach(() => { removeToken(); request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { removeToken(); vi.unstubAllGlobals(); });

describe('authenticated API response bodies', () => {
  it('completes a brand material deletion on 204 without parsing JSON or retrying deletion', async () => {
    request.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteBrandAsset(12)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(expect.stringContaining('/api/brand-assets/12/'), expect.objectContaining({ method: 'DELETE' }));
  });
  it('accepts 205 Reset Content and HEAD without JSON', async () => {
    request.mockResolvedValueOnce(new Response(null, { status: 205 })).mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(fetchWithAuth('/api/test/', { method: 'POST' })).resolves.toBeNull();
    await expect(fetchWithAuth('/api/test/', { method: 'HEAD' })).resolves.toBeNull();
  });
  it('still returns normal JSON and surfaces invalid JSON', async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify({ id: 12 }), { headers: { 'content-type': 'application/json' } })).mockResolvedValueOnce(new Response('invalid', { headers: { 'content-type': 'application/json' } }));
    await expect(fetchWithAuth('/api/test/')).resolves.toEqual({ id: 12 });
    await expect(fetchWithAuth('/api/test/')).rejects.toThrow();
  });
  it('still reports a refused deletion', async () => {
    request.mockResolvedValue(new Response(JSON.stringify({ detail: 'Sem permissão.' }), { status: 403, headers: { 'content-type': 'application/json' } }));
    await expect(deleteBrandAsset(12)).rejects.toThrow('Sem permissão.');
  });
  it('accepts empty success after refreshing an expired session', async () => {
    setToken('test-old'); setRefreshToken('test-refresh');
    request.mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ meta: { access_token: 'test-renewed' } }), { headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteBrandAsset(12)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls[2][1].headers.Authorization).toBe('Bearer test-renewed');
  });
});
