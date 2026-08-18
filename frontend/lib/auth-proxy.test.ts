import { describe, expect, it } from 'vitest';

import { buildAuthUpstreamUrl, resolveAuthBackendOrigin } from './auth-proxy';

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
});
