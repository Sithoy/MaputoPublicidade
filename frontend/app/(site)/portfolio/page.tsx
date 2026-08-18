import { PortfolioGallery } from '@/components/PortfolioGallery';

export const metadata = {
  title: 'Portfólio',
  description: 'Conheça projectos reais produzidos pela Maputo Publicidade para empresas, eventos e marcas em Moçambique.',
};

export default function PortfolioPage() {
  return <PortfolioGallery variant="page" />;
}
