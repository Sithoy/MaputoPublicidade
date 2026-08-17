import { describe, expect, it } from 'vitest';
import { normalizePaginatedResponse, resolveServerApiOrigin } from './api';

describe('resolveServerApiOrigin', () => {
  it('keeps the internal Docker service address during local development', () => {
    expect(resolveServerApiOrigin({ INTERNAL_API_URL: 'http://backend:8000' })).toBe(
      'http://backend:8000'
    );
  });

  it('uses the public content API on Vercel when the configured address is local-only', () => {
    expect(
      resolveServerApiOrigin({
        VERCEL: '1',
        INTERNAL_API_URL: 'http://backend:8000',
      })
    ).toBe('https://www.maputopublicidade.com');
  });

  it('respects an explicitly configured public API on Vercel', () => {
    expect(
      resolveServerApiOrigin({
        VERCEL_ENV: 'preview',
        INTERNAL_API_URL: 'https://api.example.com/',
      })
    ).toBe('https://api.example.com');
  });

  it('allows the Vercel fallback origin to be overridden', () => {
    expect(
      resolveServerApiOrigin({
        VERCEL: '1',
        PUBLIC_CONTENT_API_ORIGIN: 'https://content.example.com/',
      })
    ).toBe('https://content.example.com');
  });
});

describe('normalizePaginatedResponse', () => {
  it('returns the array when response is already an array', () => {
    const data = [{ id: 1 }, { id: 2 }];
    expect(normalizePaginatedResponse(data)).toEqual(data);
  });

  it('extracts results from a DRF paginated response', () => {
    const data = {
      count: 2,
      next: null,
      previous: null,
      results: [{ id: 1 }, { id: 2 }],
    };
    expect(normalizePaginatedResponse(data)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns an empty array for unexpected shapes', () => {
    expect(normalizePaginatedResponse(null)).toEqual([]);
    expect(normalizePaginatedResponse(undefined)).toEqual([]);
    expect(normalizePaginatedResponse({ count: 0 })).toEqual([]);
  });
});
