'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { cn } from '@/lib/utils';
import { getPortfolioImageSrc } from '@/lib/image-fallbacks';
import { normalizePaginatedResponse } from '@/lib/api';
import type { PortfolioItem } from '@/lib/api';
import { getPublicContentApiUrl } from '@/lib/public-content-api';

type PortfolioGalleryProps = {
  limit?: number;
  variant?: 'section' | 'page';
};

const portfolioSignals = [
  'Projectos reais',
  'Produção em Maputo',
  'Da ideia à entrega',
];

const loadingCards = Array.from({ length: 6 }, (_, index) => index);

export function PortfolioGallery({ limit, variant = 'section' }: PortfolioGalleryProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [active, setActive] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const isPage = variant === 'page';

  useEffect(() => {
    const controller = new AbortController();

    fetch(getPublicContentApiUrl('/api/portfolio/'), {
      signal: controller.signal,
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    })
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

  return (
    <section
      className={cn(
        isPage ? 'bg-[#F7F8F4] pb-16 lg:pb-24' : 'bg-[#FAFBF8] py-16 sm:py-20 lg:py-28'
      )}
    >
      {isPage ? (
        <div className="relative overflow-hidden border-b border-[#DFE6E0] bg-[#F2F5F0]">
          <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-14 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">Portfólio</p>
              <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.045em] text-dark sm:text-5xl lg:text-6xl">
                Trabalhos reais. Marcas mais presentes.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5F6D65] sm:text-lg sm:leading-8">
                Cada projecto nasce de uma necessidade concreta e termina com uma marca mais clara,
                mais visível e mais confiante no terreno.
              </p>
              <a
                href="#projectos"
                className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-brand-800 transition hover:text-brand"
              >
                Explorar projectos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <aside className="rounded-3xl bg-brand-900 p-6 text-white shadow-[0_28px_70px_-40px_rgba(3,50,35,0.75)] sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">Prova no terreno</p>
              <p className="mt-4 text-2xl font-bold leading-tight">
                A confiança cresce quando a execução acompanha a promessa.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {portfolioSignals.map((signal) => (
                  <li key={signal} className="flex items-center gap-3 text-sm font-semibold text-white/85">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-300" />
                    {signal}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      ) : null}

      <div
        id={isPage ? 'projectos' : undefined}
        className={cn('mx-auto max-w-7xl px-4 sm:px-6', isPage && 'scroll-mt-24 pt-12 lg:pt-16')}
      >
        {isPage ? (
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Projectos seleccionados</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl">
                Veja o trabalho em contexto.
              </h2>
            </div>
            {!loading ? (
              <p className="text-sm font-semibold text-[#7A8780]">
                {visibleItems.length} {visibleItems.length === 1 ? 'trabalho publicado' : 'trabalhos publicados'}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mb-10 max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Trabalhos reais</p>
            <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl lg:text-5xl">
              Trabalhos que ganham vida nas empresas, ruas e eventos de Maputo.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#66736D] sm:text-lg">
              Projectos produzidos para responder a necessidades reais de comunicação, operação e presença de marca.
            </p>
          </div>
        )}

        {!loading && categories.length > 1 ? (
          <div className="mb-9 flex flex-wrap gap-2" aria-label="Filtrar portfólio por categoria">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActive(category)}
                aria-pressed={active === category}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  active === category
                    ? 'border-brand bg-brand text-white'
                    : 'border-[#DCE4DE] bg-white text-[#52635B] hover:border-brand/30 hover:text-brand-800'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="A carregar trabalhos">
            {loadingCards.map((card) => (
              <div key={card} className="animate-pulse overflow-hidden rounded-2xl border border-[#E3E8E4] bg-white">
                <div className="aspect-[5/4] bg-[#E4EAE5]" />
                <div className="space-y-3 p-5 sm:p-6">
                  <div className="h-5 w-28 rounded-full bg-[#E8EDE9]" />
                  <div className="h-5 w-3/4 rounded bg-[#E1E7E2]" />
                  <div className="h-4 w-full rounded bg-[#EDF0ED]" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-[#E3E8E4] bg-white px-6 py-12 text-center text-sm text-[#66736D]">
            Ainda não existem trabalhos publicados nesta categoria.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => {
              const completionYear = item.completion_date?.slice(0, 4);

              return (
                <article
                  key={item.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#DCE4DE] bg-white transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_24px_55px_-36px_rgba(6,63,43,0.5)]"
                >
                  <div className="relative aspect-[5/4] overflow-hidden bg-brand-50">
                    <SafeImage
                      src={getPortfolioImageSrc(item)}
                      fallbackSrc="/images/brand/portfolio-gifts.jpg"
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                      quality={90}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                        {item.category_name || 'Projecto de marca'}
                      </span>
                      {completionYear ? (
                        <span className="text-xs font-bold tabular-nums text-[#98A39D]">{completionYear}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-lg font-bold leading-6 text-dark">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#66736D]">{item.description}</p>
                    ) : null}
                    {item.client_name ? (
                      <div className="mt-auto border-t border-[#EDF0ED] pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A39D]">Cliente</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[#6C7871]">
                          {item.client_name}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {hasMoreItems ? (
          <div className="mt-10">
            <Link
              href="/portfolio"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(8,114,71,0.75)] transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Ver mais trabalhos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        ) : null}

        {isPage && !loading ? (
          <div className="mt-14 overflow-hidden rounded-3xl bg-brand-900 px-6 py-8 text-white sm:px-8 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-10 lg:py-10">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">O próximo projecto</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                A próxima marca a ganhar presença pode ser a sua.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
                Conte-nos o que precisa de comunicar e ajudamos a encontrar a melhor forma de o tornar visível.
              </p>
            </div>
            <Link
              href="/orcamento"
              className="group mt-6 inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-900 transition hover:bg-brand-50 lg:mt-0"
            >
              Conversar sobre um projecto
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
