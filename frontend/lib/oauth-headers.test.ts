import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const config = require('../next.config.js');
const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');

async function effectiveHeaders(path: string) {
  const headers = new Map<string, string>();
  for (const rule of await config.headers()) {
    if (getPathMatch(rule.source)(path)) {
      for (const header of rule.headers) headers.set(header.key, header.value);
    }
  }
  return headers;
}

describe('OAuth response privacy', () => {
  it.each([
    '/api/integrations/email/oauth/callback',
    '/api/integrations/email/oauth/callback/',
    '/api/integrations/email/oauth/start/',
  ])('keeps %s private without weakening global security headers', async (path) => {
    const headers = await effectiveHeaders(path);
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(headers.get('Cache-Control')).toBe('private, no-store');
    expect(headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  });

  it('preserves the normal site referrer policy outside OAuth routes', async () => {
    const headers = await effectiveHeaders('/catalogo');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.has('Cache-Control')).toBe(false);
  });
});
