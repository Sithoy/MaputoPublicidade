import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrandRequest } from './client-api';

const { fetchWithAuthMock } = vi.hoisted(() => ({
  fetchWithAuthMock: vi.fn(),
}));

vi.mock('./auth', () => ({
  fetchWithAuth: fetchWithAuthMock,
  downloadWithAuth: vi.fn(),
}));

describe('createBrandRequest', () => {
  beforeEach(() => {
    fetchWithAuthMock.mockReset();
    fetchWithAuthMock.mockResolvedValue({ reference: 'ORC-2026-0008' });
  });

  it('turns the BrandDesk briefing into a quote request understood by the API', async () => {
    await createBrandRequest({
      intent: 'campaign',
      projectName: 'Campanha de fim de ano',
      serviceType: 'Rollups e brindes',
      quantity: 24.6,
      deadline: '2026-11-20',
      fulfilment: 'installation',
      needsDesign: true,
      urgency: 'urgent',
      notes: 'Instalação na sede do cliente.',
      contact: {
        name: 'Dário Nhaule',
        email: 'dario@maputopublicidade.com',
        phone: '+258 82 000 0000',
        company: 'Empresa Exemplo',
      },
    });

    expect(fetchWithAuthMock).toHaveBeenCalledOnce();
    const [path, options] = fetchWithAuthMock.mock.calls[0];
    expect(path).toBe('/api/quotes/');
    expect(options).toMatchObject({ method: 'POST' });

    const payload = JSON.parse(String(options.body));
    expect(payload).toMatchObject({
      client_name: 'Dário Nhaule',
      client_email: 'dario@maputopublicidade.com',
      client_phone: '+258 82 000 0000',
      client_company: 'Empresa Exemplo',
      urgency: 'urgent',
      items: [
        {
          description: 'Campanha de fim de ano',
          quantity: 25,
          needs_design: true,
        },
      ],
    });
    expect(payload.notes).toContain('Objetivo: Evento ou campanha.');
    expect(payload.notes).toContain('Entrega: Entrega e instalação.');
  });
});
