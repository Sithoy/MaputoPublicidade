import type { MetadataRoute } from 'next';
import { mainServices } from '@/lib/service-catalog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
  const [products, portfolio] = await Promise.all([
    fetchSlugs('/api/products/'),
    fetchSlugs('/api/portfolio/'),
  ]);

  const staticRoutes = [
    '',
    '/catalogo',
    '/servicos',
    '/sobre',
    '/contactos',
    '/portfolio',
    '/orcamento',
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
    ...portfolio.map((slug) => ({
      url: `${siteUrl}/portfolio/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];

  return routes;
}
