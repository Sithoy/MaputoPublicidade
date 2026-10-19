import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const config = require('../next.config.js');

describe('Next.js 16 image compatibility', () => {
  it('preserves the image quality values used in the current site', () => {
    expect(config.images.qualities).toEqual([75, 85, 92]);
    expect(config.images.dangerouslyAllowLocalIP).not.toBe(true);
    expect(config.images.domains).toBeUndefined();
  });
});
