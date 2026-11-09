import type { MetadataRoute } from 'next';
import { companyProfile } from '@/lib/company';
import { mainServices } from '@/lib/service-catalog';

const siteUrl = companyProfile.siteUrl;

async function fetchSlugs(path: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}${path}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: { slug: string }) => item.slug).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchSlugs('/api/products/');

  const staticRoutes = [
    '',
    '/catalogo',
    '/servicos',
    '/sobre',
    '/portfolio',
    '/orcamento',
    '/branddesk/demo',
    '/privacidade',
    '/termos',
    '/politica-cookies',
  ];

  const serviceSlugs = mainServices.map((service) => service.slug);

  const routes = [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: route === '' ? 1 : 0.8,
    })),
    ...serviceSlugs.map((slug) => ({
      url: `${siteUrl}/servicos/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((slug) => ({
      url: `${siteUrl}/catalogo/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];

  return routes;
}
