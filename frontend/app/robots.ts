import type { MetadataRoute } from 'next';
import { companyProfile } from '@/lib/company';

const siteUrl = companyProfile.siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/area-cliente/', '/carrinho'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
