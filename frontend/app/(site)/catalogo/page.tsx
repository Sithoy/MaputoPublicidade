import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getList, type Product } from '@/lib/api';
import { mainServices } from '@/lib/service-catalog';

const categories = ['Todos', ...mainServices.map((service) => service.title)];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'Catálogo | Maputo Publicidade',
  description: 'Explore o catálogo de produtos personalizáveis da Maputo Publicidade.',
  openGraph: {
    title: 'Catálogo | Maputo Publicidade',
    description: 'Explore o catálogo de produtos personalizáveis da Maputo Publicidade.',
    images: [`${siteUrl}/og-image.png`],
  },
};

export const revalidate = 60;

export default async function CatalogPage({ searchParams }: { searchParams: { categoria?: string } }) {
  const activeCategory = searchParams.categoria || 'Todos';
  let products: Product[] = [];

  try {
    products = await getList<Product>('/api/products/', { next: { revalidate: 60 } });
  } catch {
    products = [];
  }

  const filtered = activeCategory === 'Todos'
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-dark md:text-4xl">Catálogo de Produtos</h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Escolha o produto ideal para a sua empresa e peça um orçamento personalizado.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {categories.map((cat) => (
          <Link
            key={cat}
            href={cat === 'Todos' ? '/catalogo' : `/catalogo?categoria=${encodeURIComponent(cat)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-dark hover:bg-gray-200'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          Nenhum produto encontrado nesta categoria.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
