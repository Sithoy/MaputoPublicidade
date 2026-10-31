import { describe, expect, it } from 'vitest';
import { artReviewEndpoint, artReviewFailure } from './art-review-link';

describe('Artwork review route tokens', () => {
  const token = 'eyJpZCI6Mn0:1xTEST:abc_DEF-123';
  it('builds the same request for raw and already-escaped route parameters', () => {
    const expected = `/api/art-review/${encodeURIComponent(token)}/`;
    expect(artReviewEndpoint(token)).toBe(expected);
    expect(artReviewEndpoint(encodeURIComponent(token))).toBe(expected);
    expect(artReviewEndpoint(encodeURIComponent(token))).not.toContain('%253A');
  });
  it.each([undefined, null, [], ['token'], '', '%', '%ZZ', 'token/other', 'token?x=1', 'token#x', 'token\\file', '%2F', '%253A', 'a'.repeat(1025)])('rejects invalid or ambiguous input %s', (value) => {
    expect(artReviewEndpoint(value)).toBeNull();
  });
});

describe('Artwork link diagnostics', () => {
  it.each([
    [410, 'link_expired', 'ART-LINK-EXPIRED'],
    [404, 'link_invalid', 'ART-LINK-INVALID'],
    [404, 'link_replaced', 'ART-LINK-REPLACED'],
    [404, 'link_revoked', 'ART-LINK-REVOKED'],
    [404, 'link_unavailable', 'ART-LINK-UNAVAILABLE'],
    [404, 'link_outdated', 'ART-VERSION-OUTDATED'],
    [404, undefined, 'ART-LINK-INVALID'],
    [429, 'link_expired', 'ART-RATE-LIMIT'],
    [503, 'link_expired', 'ART-SERVICE'],
    [403, undefined, 'ART-ACCESS'],
  ])('classifies HTTP %s / %s as %s', (status, code, diagnostic) => {
    expect(artReviewFailure(status as number, code as string | undefined)).toContain(`[${diagnostic}]`);
  });
});
