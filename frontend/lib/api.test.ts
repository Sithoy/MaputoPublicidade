import { describe, expect, it } from 'vitest';
import { normalizePaginatedResponse } from './api';

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
