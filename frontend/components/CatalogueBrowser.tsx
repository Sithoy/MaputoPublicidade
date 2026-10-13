'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/api';
import { productCategoryName } from '@/lib/product-configuration';

export function CatalogueBrowser({ products, failed = false, category = 'Todos', query = '' }: { products: Product[]; failed?: boolean; category?: string; query?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(query);
  const categories = ['Todos', ...Array.from(new Set(products.map(productCategoryName))).sort((a, b) => a.localeCompare(b, 'pt'))];
  if (!categories.includes(category)) categories.push(category);
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt');
  const term = normalize(search.trim());
  const filtered = products.filter(p => (category === 'Todos' || productCategoryName(p) === category) && (!term || normalize(`${p.name} ${p.description} ${productCategoryName(p)}`).includes(term)));

  function categoryHref(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'Todos') next.delete('categoria'); else next.set('categoria', value);
    if (search.trim()) next.set('q', search.trim()); else next.delete('q');
    return `${pathname}${next.size ? `?${next}` : ''}#produtos`;
  }
  function reset() { setSearch(''); router.push('/catalogo#produtos', { scroll: false }); }

  return (
    <section id="produtos" aria-label="Explorar catálogo" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7A8780]">Encontre o seu próximo material</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-800">Explore o catálogo</h2></div>
        <div className="relative w-full sm:max-w-sm"><Search aria-hidden="true" className="absolute left-4 top-3.5 h-5 w-5 text-[#7A8780]" /><input aria-label="Pesquisar produtos" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="O que procura para a sua marca?" className="h-12 w-full rounded-xl border border-[#DCE5DE] bg-white pl-12 pr-4 text-sm text-dark outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" /></div>
      </div>
      <nav aria-label="Categorias de produtos" className="mt-6 flex gap-2 overflow-x-auto pb-3 sm:flex-wrap">
        {categories.map(cat => <Link key={cat} href={categoryHref(cat)} scroll={false} aria-current={category === cat ? 'page' : undefined} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${category === cat ? 'border-brand-800 bg-brand-800 text-white' : 'border-[#DCE5DE] bg-white text-[#52635B] hover:border-brand hover:text-brand-800'}`}>{cat}{cat === 'Todos' ? <span className="ml-2 opacity-70">{products.length}</span> : null}</Link>)}
      </nav>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E8E4] pt-4">
        <p role="status" className="text-sm text-[#66736D]">{failed ? 'Não foi possível carregar os produtos' : `${filtered.length} ${filtered.length === 1 ? 'produto' : 'produtos'}${category !== 'Todos' ? ` · ${category}` : ' para a sua marca'}`}</p>
        {search || category !== 'Todos' ? <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:underline"><X className="h-3.5 w-3.5" />Limpar filtros</button> : <span className="text-xs text-[#66736D]">Personalize com a identidade da sua empresa</span>}
      </div>
      {filtered.length ? <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-2xl border border-[#DCE5DE] bg-white px-6 py-14 text-center"><SlidersHorizontal className="mx-auto h-7 w-7 text-brand" /><h3 className="mt-4 text-xl font-bold text-brand-800">{failed ? 'O catálogo volta já.' : 'Vamos encontrar outra opção?'}</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#66736D]">{failed ? 'Não conseguimos carregar os produtos neste momento. Pode tentar novamente ou falar connosco sobre o que precisa.' : 'Não há produtos para esta pesquisa. Experimente outro termo ou peça ajuda à nossa equipa.'}</p><div className="mt-6 flex flex-wrap justify-center gap-4"><button onClick={failed ? () => router.refresh() : reset} className="rounded-xl border border-[#DCE5DE] px-5 py-3 text-sm font-bold text-brand-800">{failed ? 'Tentar novamente' : 'Ver todos os produtos'}</button><Link href="/orcamento" className="rounded-xl bg-brand-800 px-5 py-3 text-sm font-bold text-white">Fale sobre o seu projeto</Link></div></div>}
    </section>
  );
}
