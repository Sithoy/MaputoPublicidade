import { describe, expect, it } from 'vitest';
import { brandDeskLoginPath, brandDeskReturnPath, brandDeskReviewPath } from './branddesk-review';

describe('BrandDesk approval return paths', () => {
  it.each(['proposal', 'art'] as const)('preserves the exact %s review without private tokens', (kind) => {
    const path = brandDeskReviewPath('MP-0001-2026', kind);
    expect(path).toBe(`/area-cliente/orcamentos/MP-0001-2026#${kind === 'art' ? 'arte' : 'proposta'}`);
    const login = brandDeskLoginPath(path);
    expect(brandDeskReturnPath(new URL(login, 'https://example.test').searchParams.get('next'))).toBe(path);
    expect(login).not.toContain('token');
  });
  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/admin', '/area-cliente/login', '/area-cliente/orcamentos/../login', '/area-cliente/orcamentos/%2e%2e', '/area-cliente/orcamentos/MP-1?token=private', '/area-cliente/orcamentos/MP-1#token=private', '/area-cliente/orcamentos/MP-1\n', '/area-cliente/orcamentos/MP-1#arte/extra'])('rejects unsafe or unrelated return destinations: %s', (path) => {
    expect(brandDeskReturnPath(path)).toBe('/area-cliente');
  });
  it('retains the normal login destination for unrelated client pages', () => {
    expect(brandDeskLoginPath('/area-cliente/marca')).toBe('/area-cliente/login');
  });
});
