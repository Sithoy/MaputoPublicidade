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
    expect(new URL(fetcher.mock.calls[0][0]).search).toBe('');
    expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(fetcher.mock.calls[0][1].headers.get('authorization')).toBe('Bearer test-only-value');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });
  it.each(['admin', 'config/extra', '__proto__', 'auth/redirect'])('does not proxy an unapproved allauth resource: %s', async (resource) => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await authApi(new Request('https://mp.test/auth-api/app/v1/anything'), { params: Promise.resolve({ path: ['app', 'v1', ...resource.split('/')] }) });
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects a method not allowed on a recognized endpoint before fetching', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await authApi(new Request('https://mp.test/auth-api/app/v1/auth/login'), { params: Promise.resolve({ path: ['app', 'v1', 'auth', 'login'] }) });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([301, 302, 303, 307, 308])('blocks upstream redirect status %s without leaking its destination', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status, headers: { location: 'http://169.254.169.254/' } })));
    const response = await authApi(new Request('https://mp.test/auth-api/app/v1/auth/session'), { params: Promise.resolve({ path: ['app', 'v1', 'auth', 'session'] }) });
    expect(response.status).toBe(502);
    expect(response.headers.get('location')).toBeNull();
  });
  it.each([
    ['auth', 'login'], ['auth', 'signup'], ['auth', 'logout'], ['tokens', 'refresh'],
  ])('preserves app auth POST %s/%s and its JSON body', async (group, action) => {
    vi.stubEnv('INTERNAL_API_URL', 'https://backend.example.com');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    const payload = JSON.stringify({ opaque: 'test request' });
    await authApi(new Request('https://mp.test/ignored?url=https://evil.test', { method: 'POST', body: payload }), { params: Promise.resolve({ path: ['app', 'v1', group, action] }) });
    expect(fetcher.mock.calls[0][0]).toBe(`https://backend.example.com/_allauth/app/v1/${group}/${action}`);
    expect(new TextDecoder().decode(fetcher.mock.calls[0][1].body)).toBe(payload);
  });
  it('does not forward upstream redirects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://evil.test' } })));
    const response = await authApi(new Request('https://maputopublicidade.com/auth-api/app/v1/auth/session'), { params: Promise.resolve({ path: ['app', 'v1', 'auth', 'session'] }) });
    expect(response.status).toBe(502);
    expect(response.headers.has('location')).toBe(false);
  });
});
