'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SafeImage } from '@/components/SafeImage';
import { ArrowRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPortfolioImageSrc } from '@/lib/image-fallbacks';
import { normalizePaginatedResponse } from '@/lib/api';
import type { PortfolioItem } from '@/lib/api';

type PortfolioGalleryProps = {
  limit?: number;
};

export function PortfolioGallery({ limit }: PortfolioGalleryProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [active, setActive] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/portfolio/', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível carregar o portfólio.');
        return res.json();
      })
      .then((data) => {
        setItems(normalizePaginatedResponse<PortfolioItem>(data));
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const categories = [
    'Todos',
    ...Array.from(
      new Set(items.map((item) => item.category_name).filter((name): name is string => !!name))
    ),
  ];

  const filtered =
    active === 'Todos'
      ? items
      : items.filter((item) => item.category_name === active);
  const visibleItems = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
  const hasMoreItems = typeof limit === 'number' && filtered.length > limit;

  if (loading) {
    return (
      <section className="bg-[#FAFBF8] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <p className="text-[#66736D]">A carregar trabalhos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#FAFBF8] py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Trabalhos reais</p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl lg:text-5xl">
            Trabalhos que ganham vida nas empresas, ruas e eventos de Maputo.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#66736D] sm:text-lg">
            Projetos produzidos para responder a necessidades reais de comunicação, operação e presença de marca.
          </p>
        </div>

        <div className="mb-9 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active === cat
                  ? 'border-brand bg-brand text-white'
                  : 'border-[#E3E8E4] bg-white text-[#52635B] hover:border-brand/30 hover:text-brand-800'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-[#E3E8E4] bg-white px-6 py-12 text-center text-sm text-[#66736D]">
            Ainda não existem trabalhos publicados nesta categoria.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-[#E3E8E4] bg-white transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_22px_50px_-34px_rgba(6,63,43,0.45)]"
            >
              <div className="relative aspect-[5/4] overflow-hidden bg-brand-50">
                <SafeImage
                  src={getPortfolioImageSrc(item)}
                  fallbackSrc="/images/brand/portfolio-gifts.jpg"
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                />
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                    {item.category_name || 'Projeto de marca'}
                  </span>
                  <MapPin className="h-4 w-4 text-[#A3AEA8]" />
                </div>
                <h3 className="mt-4 text-lg font-bold leading-6 text-dark">{item.title}</h3>
                {item.description ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#66736D]">{item.description}</p>
                ) : null}
                {item.client_name ? (
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A9690]">{item.client_name}</p>
                ) : null}
              </div>
            </article>
            ))}
          </div>
        )}

        {hasMoreItems ? (
          <div className="mt-10">
            <Link href="/portfolio" className="group inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(8,114,71,0.75)] transition hover:-translate-y-0.5 hover:bg-brand-600">
              Ver mais trabalhos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
