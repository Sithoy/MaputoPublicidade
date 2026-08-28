import { describe, expect, it } from 'vitest';

import {
  buildAccountsUpstreamUrl,
  buildAuthUpstreamUrl,
  cookieHeaderFromSetCookie,
  getCookieValue,
  resolveAuthBackendOrigin,
  splitSetCookieHeaders,
} from './auth-proxy';

describe('resolveAuthBackendOrigin', () => {
  it('uses the configured backend origin', () => {
    expect(
      resolveAuthBackendOrigin({
        INTERNAL_API_URL: 'https://backend.example.com/',
        VERCEL: '1',
      })
    ).toBe('https://backend.example.com');
  });

  it('does not use a Docker-only origin on Vercel', () => {
    expect(
      resolveAuthBackendOrigin({ INTERNAL_API_URL: 'http://backend:8000', VERCEL: '1' })
    ).toBe('https://maputo-publicidade-backend-4ppp.onrender.com');
  });

  it('keeps the Docker backend for local development', () => {
    expect(resolveAuthBackendOrigin({})).toBe('http://backend:8000');
  });
});

describe('buildAuthUpstreamUrl', () => {
  it('maps the proxy route to the allauth endpoint and preserves the query', () => {
    expect(
      buildAuthUpstreamUrl(['app', 'v1', 'auth', 'login'], '?next=%2Fadmin', {
        INTERNAL_API_URL: 'https://backend.example.com',
      })
    ).toBe('https://backend.example.com/_allauth/app/v1/auth/login?next=%2Fadmin');
  });

  it('maps OAuth callback paths to the headed allauth endpoint', () => {
    expect(
      buildAccountsUpstreamUrl(['google', 'login', 'callback'], '?code=abc', {
        INTERNAL_API_URL: 'https://backend.example.com',
      })
    ).toBe('https://backend.example.com/accounts/google/login/callback?code=abc');
  });
});

describe('social auth cookies', () => {
  it('preserves multiple Set-Cookie headers including Expires commas', () => {
    const headers = new Headers({
      'set-cookie':
        'csrftoken=csrf123; Path=/; SameSite=Lax, sessionid=session123; Expires=Sat, 29 Aug 2026 10:00:00 GMT; Path=/; HttpOnly; SameSite=Lax',
    });

    const cookies = splitSetCookieHeaders(headers);
    expect(cookies).toHaveLength(2);
    expect(cookieHeaderFromSetCookie(cookies)).toBe(
      'csrftoken=csrf123; sessionid=session123'
    );
    expect(getCookieValue(cookieHeaderFromSetCookie(cookies), 'csrftoken')).toBe(
      'csrf123'
    );
  });
});
