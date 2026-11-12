import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

afterEach(() => vi.unstubAllEnvs());

describe('environment indexing', () => {
  it('blocks crawling and omits the production sitemap in previews', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  it('preserves production crawling rules', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(robots().rules).toEqual([{ userAgent: '*', allow: '/', disallow: ['/admin/', '/area-cliente/', '/carrinho'] }]);
    expect(robots().sitemap).toContain('/sitemap.xml');
  });
});
