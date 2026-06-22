import { HeroSection } from '@/components/HeroSection';
import { ServicesSection } from '@/components/ServicesSection';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { HowItWorks } from '@/components/HowItWorks';
import { StatsSection } from '@/components/StatsSection';
import { PortfolioGallery } from '@/components/PortfolioGallery';
import { PartnersSection } from '@/components/PartnersSection';
import { PackagesSection } from '@/components/PackagesSection';
import { CTABanner } from '@/components/CTABanner';

export default function HomePage() {
  return (
    <>
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
