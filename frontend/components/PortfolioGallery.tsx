'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { normalizePaginatedResponse } from '@/lib/api';
import type { PortfolioItem } from '@/lib/api';

export function PortfolioGallery() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [active, setActive] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portfolio/')
      .then((res) => res.json())
      .then((data) => {
        setItems(normalizePaginatedResponse<PortfolioItem>(data));
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  if (loading) {
    return (
      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 text-center">
          <p className="text-gray-500">A carregar portfólio...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-dark md:text-4xl">Portfólio Recente</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Alguns dos trabalhos que ajudaram marcas moçambicanas a crescer.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                active === cat
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-dark hover:bg-gray-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition hover:shadow-lg"
            >
              <div className="relative aspect-[5/4]">
                <Image
                  src={item.image || '/images/screen-printing.jpg'}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-dark/85 to-transparent p-4 pt-16 text-white">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-200">{item.category_name || item.client_name}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button variant="primary" className="gap-2">
            Ver mais trabalhos
          </Button>
        </div>
      </div>
    </section>
  );
}
