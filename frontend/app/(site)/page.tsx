import { HeroSection } from '@/components/HeroSection';
import { ServicesSection } from '@/components/ServicesSection';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { HowItWorks } from '@/components/HowItWorks';
import { StatsSection } from '@/components/StatsSection';
import { PortfolioGallery } from '@/components/PortfolioGallery';
import { PartnersSection } from '@/components/PartnersSection';
import { PackagesSection } from '@/components/PackagesSection';
import { CTABanner } from '@/components/CTABanner';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Maputo Publicidade',
  description:
    'Soluções completas em serigrafia, gráfica, impressão digital, brindes corporativos e branding de viaturas em Maputo, Moçambique.',
  url: siteUrl,
  telephone: '+25882555736',
  email: 'maputopublicidade@outlook.com',
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
  title: 'Publicidade, Gráfica e Impressão Digital em Maputo',
  description:
    'Soluções completas em serigrafia, gráfica, impressão digital, brindes corporativos e branding de viaturas em Maputo, Moçambique.',
  openGraph: {
    title: 'Maputo Publicidade | Publicidade, Gráfica e Impressão Digital',
    description:
      'Soluções completas em serigrafia, gráfica, impressão digital, brindes corporativos e branding de viaturas em Maputo, Moçambique.',
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
      <ServicesSection />
      <FeaturedProducts />
      <HowItWorks />
      <StatsSection />
      <PortfolioGallery />
      <PartnersSection />
      <PackagesSection />
      <CTABanner />
    </>
  );
}
