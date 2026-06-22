import { PortfolioGallery } from '@/components/PortfolioGallery';

export const metadata = {
  title: 'Portfólio | Maputo Publicidade',
  description: 'Veja os trabalhos mais recentes da Maputo Publicidade.',
};

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-dark md:text-4xl">Portfólio</h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Projectos reais que mostram a qualidade e versatilidade dos nossos serviços.
        </p>
      </div>
      <PortfolioGallery />
    </div>
  );
}
