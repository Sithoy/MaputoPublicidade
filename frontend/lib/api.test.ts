import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  get,
  normalizePaginatedResponse,
  resolveServerApiOrigin,
  resolveServerGetFallbackUrl,
} from './api';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

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

  it('provides a public GET fallback for a local-only server address', () => {
    expect(
      resolveServerGetFallbackUrl('/api/products/', {
        INTERNAL_API_URL: 'http://backend:8000',
      })
    ).toBe('https://www.maputopublicidade.com/api/products/');
  });

  it('provides the content fallback when another public server is configured', () => {
    expect(
      resolveServerGetFallbackUrl('/api/products/', {
        INTERNAL_API_URL: 'https://api.example.com',
      })
    ).toBe('https://www.maputopublicidade.com/api/products/');
  });

  it('does not create a fallback loop when the public content API is primary', () => {
    expect(
      resolveServerGetFallbackUrl('/api/products/', {
        INTERNAL_API_URL: 'https://www.maputopublicidade.com',
      })
    ).toBeNull();
  });
});

describe('get', () => {
  it('retries a failed server GET against the public content API', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubEnv('INTERNAL_API_URL', 'https://api.example.com');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 16, name: 'Camissete Polo Branca' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(get<{ id: number }>('/api/products/')).resolves.toMatchObject({ id: 16 });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://www.maputopublicidade.com/api/products/',
      expect.any(Object)
    );
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
