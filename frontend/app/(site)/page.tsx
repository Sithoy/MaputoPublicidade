import { HeroSection } from '@/components/HeroSection';
import { TrustMetricsSection } from '@/components/TrustMetricsSection';
import { BrandPlatformSection } from '@/components/BrandPlatformSection';
import { BrandTouchpointsSection } from '@/components/BrandTouchpointsSection';
import { HowItWorks } from '@/components/HowItWorks';
import { PortfolioGallery } from '@/components/PortfolioGallery';
import { WhyTrustSection } from '@/components/WhyTrustSection';
import { PartnersSection } from '@/components/PartnersSection';
import { CTABanner } from '@/components/CTABanner';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Maputo Publicidade',
  description:
    'Parceiro de execução e gestão de marca para empresas em Maputo, da criação à produção, instalação e entrega.',
  url: siteUrl,
  telephone: '+25882555736',
  email: 'info@maputopublicidade.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rua da Resistência Nº 1550 R/C',
    addressLocality: 'Maputo',
    addressCountry: 'MZ',
  },
  sameAs: [
    'https://www.facebook.com/maputopublicidade',
    'https://www.instagram.com/maputopublicidade',
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '17:00',
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
