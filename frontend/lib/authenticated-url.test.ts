import { describe, expect, it } from 'vitest';
import { authenticatedApiPath } from './authenticated-url';

describe('authenticated API destination', () => {
  it.each([
    'https://evil.test/api/image', '//evil.test/api/image', '/\\evil.test/image',
    '/api/../../outside', '/api/%2e%2e/outside', '/api/..//evil.test/',
    '/api/image#fragment', '/api/\timage', 'javascript:alert(1)', '/media/image.png',
  ])('rejects untrusted destinations %s', (path) => {
    expect(() => authenticatedApiPath(path)).toThrow('Invalid authenticated API path');
  });
  it.each(['/api/brand-assets/12/file/', '/api/quotes/MP-1/attachment/?id=1&preview=1', '/api/products/?page=2'])('keeps local API paths %s', (path) => {
    expect(authenticatedApiPath(path)).toBe(path);
  });
});
