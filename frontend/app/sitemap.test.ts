import { afterEach, expect, it, vi } from 'vitest';
import { mainServices } from '@/lib/service-catalog';
import sitemap from './sitemap';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('lists public pages, services, and products without redirects or missing portfolio routes', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json([{ slug: 'uniforme-corporativo' }]),
  );
  vi.stubGlobal('fetch', fetchMock);

  const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0][0]).toContain('/api/products/');
  expect(urls).toEqual(expect.arrayContaining([
    '/',
    '/catalogo',
    '/catalogo/uniforme-corporativo',
    '/portfolio',
    '/privacidade',
    '/termos',
    '/politica-cookies',
    ...mainServices.map((service) => `/servicos/${service.slug}`),
  ]));
  expect(urls).not.toContain('/contactos');
  expect(urls.some((url) => /^\/portfolio\/.+/.test(url))).toBe(false);
});

it('keeps static and service routes when the product API is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unavailable')));

  const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);

  expect(urls).toContain('/');
  expect(urls).toContain('/catalogo');
  expect(urls).toEqual(expect.arrayContaining(
    mainServices.map((service) => `/servicos/${service.slug}`),
  ));
});
