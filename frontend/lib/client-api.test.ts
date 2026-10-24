import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrandRequest, createQuoteFromCart, previewRequestAttachment } from './client-api';
import { fetchBlobWithAuth } from './auth';

const { fetchWithAuthMock } = vi.hoisted(() => ({ fetchWithAuthMock: vi.fn() }));
vi.mock('./auth', () => ({ fetchWithAuth: fetchWithAuthMock, downloadWithAuth: vi.fn(), fetchBlobWithAuth: vi.fn() }));

describe('createBrandRequest', () => {
  it('sends checkout references with the same private multipart contract', async () => {
    const logo = new File(['png'], 'logo.png');
    await createQuoteFromCart({} as Parameters<typeof createQuoteFromCart>[0], { client_name: 'Empresa', client_email: 'compras@example.test' }, [logo]);
    const [path, options] = fetchWithAuthMock.mock.calls[0];
    expect(path).toBe('/api/cart/convert-to-quote/');
    expect(options.body.getAll('files')).toEqual([logo]);
    expect(JSON.parse(options.body.get('payload'))).toMatchObject({ client_name: 'Empresa' });
    expect(options.headers).toBeUndefined();
  });
  it('previews Studio references through the technical API, never commercial quote details', async () => {
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    await previewRequestAttachment('MP-0001-2026', 7, undefined, 'production');
    expect(fetchBlobWithAuth).toHaveBeenCalledWith('/api/production/MP-0001-2026/references/7/?preview=1', { signal: undefined });
  });
  beforeEach(() => { fetchWithAuthMock.mockReset(); fetchWithAuthMock.mockResolvedValue({ reference: 'MP-0008-2026' }); });
  it('sends independent materials and files without pricing or client ownership fields', async () => {
    const file = new File(['%PDF-1.4'], 'brief.pdf', { type: 'application/pdf' });
    await createBrandRequest({ intent: 'campaign', projectName: 'Campanha', fulfilment: 'installation', needsDesign: true, urgency: 'urgent',
      items: [{ description: 'Rollups', quantity: 2, material_briefing: { work_type: 'signage', needs_visit: true } }, { description: 'Polos', quantity: 50 }], files: [file], deliveryAddress: 'Matola',
      contact: { name: 'Dário', email: 'dario@example.com', company: 'Empresa' }, notes: 'Na sede' });
    const [path, options] = fetchWithAuthMock.mock.calls[0];
    expect(path).toBe('/api/quotes/brand-request/');
    expect(options.body).toBeInstanceOf(FormData);
    const payload = JSON.parse(options.body.get('payload'));
    expect(payload.items).toEqual([{ description: 'Rollups', quantity: 2, material_briefing: { work_type: 'signage', needs_visit: true } }, { description: 'Polos', quantity: 50 }]);
    expect(payload.delivery_address).toBe('Matola');
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
