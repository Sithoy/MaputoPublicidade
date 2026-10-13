import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveProductDefinition, updateProduct } from './admin-api';
import { patch, post } from './api';

vi.mock('./api', async importOriginal => ({ ...await importOriginal<typeof import('./api')>(), patch: vi.fn(), post: vi.fn() }));
vi.mock('./auth', () => ({ getToken: () => 'local-test-token', downloadWithAuth: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
describe('Product editor API boundary', () => {
  it('sends complete definitions to the dedicated endpoints without falling back to legacy writes', async () => {
    const data = new FormData();
    data.set('variant_config', '[]');
    await saveProductDefinition(data);
    expect(post).toHaveBeenCalledWith('/api/products/editor/', data, 'local-test-token');
    await saveProductDefinition(data, 'polo');
    expect(patch).toHaveBeenCalledWith('/api/products/polo/editor/', data, 'local-test-token');
  });
  it('keeps quick product toggles on the existing partial-update endpoint', async () => {
    const data = new FormData();
    data.set('is_active', 'false');
    await updateProduct('polo', data);
    expect(patch).toHaveBeenCalledWith('/api/products/polo/', data, 'local-test-token');
  });
});
