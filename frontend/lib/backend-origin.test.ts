import { createRequire } from 'node:module';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { resolveBackendOrigin } from './backend-origin';

const require = createRequire(import.meta.url);
const config = require('../next.config.js');
afterEach(() => vi.unstubAllEnvs());

describe('backend environment isolation', () => {
  it.each(['preview', 'development'])('refuses missing configuration in hosted %s', (environment) => {
    expect(() => resolveBackendOrigin({ VERCEL_ENV: environment })).toThrow('INTERNAL_API_URL');
  });
  it.each([
    'https://maputopublicidade.com', 'https://www.maputopublicidade.com',
    'https://mp-backend-production-654913531299.us-east4.run.app',
    'https://mp-backend-production-li3tt3hwvq-uk.a.run.app',
    'https://candidate---mp-backend-production-li3tt3hwvq-uk.a.run.app',
  ])('rejects live backend %s outside production', (origin) => {
    expect(() => resolveBackendOrigin({ VERCEL_ENV: 'preview', INTERNAL_API_URL: origin })).toThrow('Nonproduction');
    expect(() => resolveBackendOrigin({ INTERNAL_API_URL: origin })).toThrow('Nonproduction');
    expect(resolveBackendOrigin({ VERCEL_ENV: 'production', INTERNAL_API_URL: origin })).toBe(origin);
  });
  it.each([
    'https://maputo-publicidade-backend-4ppp.onrender.com',
    'https://maputo-publicidade-backend.onrender.com',
    'https://user:password@staging.example.com',
    'https://staging.example.com/api', 'https://staging.example.com?redirect=x',
  ])('rejects retired or malformed upstream %s', (origin) => {
    expect(() => resolveBackendOrigin({ VERCEL_ENV: 'preview', INTERNAL_API_URL: origin })).toThrow();
  });
  it('uses the same isolated backend for every Next rewrite', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('INTERNAL_API_URL', 'https://staging.example.com');
    const rewrites = await config.rewrites();
    expect(rewrites).toHaveLength(3);
    for (const rule of rewrites) expect(rule.destination).toMatch(/^https:\/\/staging\.example\.com\//);
  });
});
