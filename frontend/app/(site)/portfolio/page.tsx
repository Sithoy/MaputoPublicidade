import { PortfolioGallery } from '@/components/PortfolioGallery';

export const metadata = {
  title: 'Portfólio',
  description: 'Explore o portfólio da Maputo Publicidade: aplicações de marca, materiais e acabamentos para empresas, eventos e campanhas em Moçambique.',
  alternates: { canonical: '/portfolio' },
  openGraph: { url: '/portfolio' },
};

export default function PortfolioPage() {
  return <PortfolioGallery variant="page" />;
}
