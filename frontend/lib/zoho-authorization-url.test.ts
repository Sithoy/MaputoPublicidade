import { describe, expect, it } from 'vitest';
import { zohoAuthorizationUrl } from './zoho-authorization-url';

describe('Zoho OAuth navigation', () => {
  it.each([
    'javascript:alert(1)', '//accounts.zoho.com/oauth/v2/auth',
    'http://accounts.zoho.com/oauth/v2/auth', 'https://accounts.zoho.com.evil.test/oauth/v2/auth',
    'https://accounts.zoho.com@evil.test/oauth/v2/auth', 'https://user:pass@accounts.zoho.com/oauth/v2/auth',
    'https://accounts.zoho.com/oauth/v2/other', 'https://accounts.zoho.com/oauth/v2/auth#fragment',
    'https://accounts.zoho.com\\@evil.test/oauth/v2/auth', undefined,
  ])('blocks a malformed or non-approved destination %s', (url) => {
    expect(() => zohoAuthorizationUrl(url)).toThrow();
  });
  it('preserves opaque OAuth parameters without letting them select the host', () => {
    const source = 'https://accounts.zoho.com/oauth/v2/auth?client_id=example&state=https%3A%2F%2Fevil.test&redirect_uri=https%3A%2F%2Fmaputopublicidade.com%2Fcallback';
    expect(zohoAuthorizationUrl(source)).toBe(source);
    expect(new URL(zohoAuthorizationUrl(source)).origin).toBe('https://accounts.zoho.com');
  });
});
