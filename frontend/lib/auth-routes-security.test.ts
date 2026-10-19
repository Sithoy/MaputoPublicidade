import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as authApi } from '@/app/auth-api/[...path]/route';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('production app authentication proxy', () => {
  it.each([{ path: ['app', 'v1', '..'] }, { path: ['app', 'v1', '%2e%2e'] }, { path: ['browser', 'v1', 'config'] }])('rejects unsupported/traversal path $path before fetching', async ({ path }) => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await authApi(new Request('https://attacker.test/auth-api/app/v1/login'), { params: Promise.resolve({ path }) });
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps the configured origin, cache policy and token headers', async () => {
    vi.stubEnv('INTERNAL_API_URL', 'https://backend.example.com');
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    const response = await authApi(new Request('https://attacker.test/auth-api/app/v1/auth/session?next=https://evil.test', { headers: { authorization: 'Bearer test-only-value' } }), { params: Promise.resolve({ path: ['app', 'v1', 'auth', 'session'] }) });
    expect(new URL(fetcher.mock.calls[0][0]).origin).toBe('https://backend.example.com');
    expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
    expect(fetcher.mock.calls[0][1].headers.get('authorization')).toBe('Bearer test-only-value');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });
  it('does not forward upstream redirects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://evil.test' } })));
    const response = await authApi(new Request('https://maputopublicidade.com/auth-api/app/v1/auth/session'), { params: Promise.resolve({ path: ['app', 'v1', 'auth', 'session'] }) });
    expect(response.status).toBe(502);
    expect(response.headers.has('location')).toBe(false);
  });
});
