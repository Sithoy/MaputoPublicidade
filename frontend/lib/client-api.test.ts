import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrandRequest } from './client-api';

const { fetchWithAuthMock } = vi.hoisted(() => ({ fetchWithAuthMock: vi.fn() }));
vi.mock('./auth', () => ({ fetchWithAuth: fetchWithAuthMock, downloadWithAuth: vi.fn() }));

describe('createBrandRequest', () => {
  beforeEach(() => { fetchWithAuthMock.mockReset(); fetchWithAuthMock.mockResolvedValue({ reference: 'MP-0008-2026' }); });
  it('sends independent materials and files without pricing or client ownership fields', async () => {
    const file = new File(['%PDF-1.4'], 'brief.pdf', { type: 'application/pdf' });
    await createBrandRequest({ intent: 'campaign', projectName: 'Campanha', fulfilment: 'installation', needsDesign: true, urgency: 'urgent',
      items: [{ description: 'Rollups', quantity: 2 }, { description: 'Polos', quantity: 50 }], files: [file],
      contact: { name: 'Dário', email: 'dario@example.com', company: 'Empresa' }, notes: 'Na sede' });
    const [path, options] = fetchWithAuthMock.mock.calls[0];
    expect(path).toBe('/api/quotes/brand-request/');
    expect(options.body).toBeInstanceOf(FormData);
    const payload = JSON.parse(options.body.get('payload'));
    expect(payload.items).toEqual([{ description: 'Rollups', quantity: 2 }, { description: 'Polos', quantity: 50 }]);
    expect(payload).not.toHaveProperty('client_name');
    expect(payload).not.toHaveProperty('final_price');
    expect(options.body.getAll('files')).toEqual([file]);
    expect(options.headers).toBeUndefined();
  });
  it('does not fabricate a quantity for guidance', async () => {
    await createBrandRequest({ intent: 'guidance', projectName: 'Campanha', fulfilment: 'pickup', needsDesign: false, urgency: 'normal', items: [], notes: 'Preciso de orientação', contact: { name: 'Cliente', email: 'cliente@example.com' } });
    const payload = JSON.parse(fetchWithAuthMock.mock.calls[0][1].body.get('payload'));
    expect(payload.items).toEqual([]);
  });
});
