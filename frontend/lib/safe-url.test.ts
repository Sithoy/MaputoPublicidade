import { describe, expect, it } from 'vitest';
import { safeFileUrl } from './safe-url';

describe('file URL validation', () => {
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)', '//evil.test/file', '/\\evil.test/file', 'https://user:pass@example.com/file', ' https://example.com/file', undefined])('rejects unsafe URL %s', value => {
    expect(safeFileUrl(value)).toBeUndefined();
  });
  it.each(['/api/brand-assets/1/file/', '/media/logo%20MP.png', 'https://cdn.example.com/logo.png?signature=abc', 'http://localhost:8000/media/logo.png'])('preserves allowed file URL %s', value => {
    expect(safeFileUrl(value)).toBe(value);
  });
});
