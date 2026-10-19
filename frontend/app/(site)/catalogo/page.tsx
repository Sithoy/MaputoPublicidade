import Link from 'next/link';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import { CatalogueBrowser } from '@/components/CatalogueBrowser';
import { getList, type Product } from '@/lib/api';
import { companyProfile, whatsappHref } from '@/lib/company';

export const metadata = {
  title: 'Catálogo | Maputo Publicidade',
  description: 'Encontre os materiais certos para dar presença à sua marca. Explore produtos e prepare um pedido personalizado.',
  openGraph: { images: [`${companyProfile.siteUrl}/og-image.png`] },
};
export const revalidate = 60;

export default async function CatalogPage({ searchParams: pendingSearchParams }: { searchParams: Promise<{ categoria?: string; q?: string }> }) {
  const searchParams = await pendingSearchParams;
  let products: Product[] = [];
  let failed = false;
  try { products = await getList<Product>('/api/products/', { next: { revalidate: 60 } }); }
  catch { failed = true; }
  return (
    <div className="bg-light">
      <section className="relative overflow-hidden border-b border-[#E3E8E4] bg-[#F4F0E8]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-48 h-[650px] w-[650px] rounded-full border border-[#D6A842]/20" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Catálogo · Maputo Publicidade</p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[1.1] tracking-[-0.04em] text-brand-800 sm:text-5xl lg:text-6xl">A sua marca merece<br className="hidden sm:block" /> estar presente.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#66736D] sm:text-lg">Da equipa que a representa aos espaços onde recebe os seus clientes. Encontre o material certo e dê-lhe a identidade da sua empresa.</p>
          </div>
          <div className="border-l-2 border-accent pl-6">
            <p className="text-sm font-bold text-brand-800">O produto é só o ponto de partida.</p>
            <p className="mt-2 text-sm leading-6 text-[#66736D]">Escolha, indique quantidades e partilhe a sua ideia. A nossa equipa confirma os detalhes e prepara a proposta.</p>
            <Link href="/orcamento" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-800 hover:underline">Fale sobre o seu projeto <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
      <CatalogueBrowser key={searchParams.q || ''} products={products} failed={failed} category={searchParams.categoria || 'Todos'} query={searchParams.q || ''} />
      <section className="border-t border-[#E3E8E4] bg-[#EDF2EC]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Uma ideia, muitas possibilidades</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-800 sm:text-3xl">Não encontra exatamente o que procura?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736D]">Partilhe uma referência, uma fotografia ou uma descrição. Ajudamos a encontrar uma solução para a sua marca.</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-brand-800">{['Personalização à sua medida', 'Proposta antes da produção', 'Acompanhamento pela MP'].map(text => <span key={text} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-brand" />{text}</span>)}</div>
          </div>
          <a href={whatsappHref('Olá! Gostaria de ajuda para escolher materiais para a minha marca.')} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-3 rounded-xl bg-brand-800 px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-700"><MessageCircle className="h-4 w-4" />Vamos encontrar a solução</a>
        </div>
      </section>
    </div>
  );
}
