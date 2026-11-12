import type { MetadataRoute } from 'next';
import { companyProfile } from '@/lib/company';

const siteUrl = companyProfile.siteUrl;

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === 'preview') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
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
