import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const config = require('../next.config.js');
const { hasRemoteMatch } = require('next/dist/shared/lib/match-remote-pattern');

describe('Next.js 16 image compatibility', () => {
  it('preserves the image quality values used in the current site', () => {
    expect(config.images.qualities).toEqual([75, 85, 92]);
    expect(config.images.dangerouslyAllowLocalIP).not.toBe(true);
    expect(config.images.domains).toBeUndefined();
  });

  it('permits only MP public image folders from Google Storage', () => {
    const allowed = (url: string) => hasRemoteMatch([], config.images.remotePatterns, new URL(url));
    const bucket = 'https://storage.googleapis.com/maputo-publicidade-gcp-media-654913531299';
    expect(allowed(`${bucket}/products/sample.png`)).toBe(true);
    expect(allowed(`${bucket}/partners/logo.png`)).toBe(true);
    expect(allowed(`${bucket}/uploads/artwork_proofs/private.png`)).toBe(false);
    expect(allowed(`${bucket}/private/brand_assets/private.png`)).toBe(false);
    expect(allowed('https://storage.googleapis.com/another-bucket/products/sample.png')).toBe(false);
  });
});
