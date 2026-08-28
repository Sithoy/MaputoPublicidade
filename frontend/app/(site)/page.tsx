import { HeroSection } from '@/components/HeroSection';
import { TrustMetricsSection } from '@/components/TrustMetricsSection';
import { BrandPlatformSection } from '@/components/BrandPlatformSection';
import { BrandTouchpointsSection } from '@/components/BrandTouchpointsSection';
import { HowItWorks } from '@/components/HowItWorks';
import { PortfolioGallery } from '@/components/PortfolioGallery';
import { WhyTrustSection } from '@/components/WhyTrustSection';
import { PartnersSection } from '@/components/PartnersSection';
import { CTABanner } from '@/components/CTABanner';
import { companyProfile } from '@/lib/company';

const siteUrl = companyProfile.siteUrl;

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: companyProfile.displayName,
  description:
    'Parceiro de execução e gestão de marca para empresas em Maputo, da criação à produção, instalação e entrega.',
  url: siteUrl,
  telephone: companyProfile.primaryPhone,
  email: companyProfile.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: companyProfile.streetAddress,
    addressLocality: companyProfile.city,
    addressCountry: companyProfile.countryCode,
  },
  sameAs: [companyProfile.facebookUrl, companyProfile.instagramUrl].filter(Boolean),
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: companyProfile.openingHours.days,
      opens: companyProfile.openingHours.opens,
      closes: companyProfile.openingHours.closes,
    },
  ],
};

export const metadata = {
  title: 'Gestão e Produção de Marca em Maputo',
  description:
    'Há mais de 10 anos a ajudar empresas a gerir uma presença visual consistente, da criação à produção, instalação e entrega.',
  openGraph: {
    title: 'Maputo Publicidade | Presença de Marca em Maputo',
    description:
      'Parceiro de execução e gestão de marca para empresas em Maputo, da primeira conversa à entrega final.',
    url: siteUrl,
    images: [`${siteUrl}/og-image.png`],
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HeroSection />
      <TrustMetricsSection />
      <PartnersSection />
      <BrandPlatformSection />
      <BrandTouchpointsSection />
      <PortfolioGallery limit={6} />
      <HowItWorks />
      <WhyTrustSection />
      <CTABanner />
    </>
  );
}
