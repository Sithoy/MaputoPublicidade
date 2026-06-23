import Link from 'next/link';
import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { getList, type Product } from '@/lib/api';
import { mainServices } from '@/lib/service-catalog';

const categories = ['Todos', ...mainServices.map((service) => service.title)];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Vi o catálogo da Maputo Publicidade e gostaria de pedir ajuda para escolher um produto.';

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
  let productsLoadFailed = false;

  try {
    products = await getList<Product>('/api/products/', { next: { revalidate: 60 } });
  } catch {
    products = [];
    productsLoadFailed = true;
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
        <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center shadow-sm sm:p-10">
          <h2 className="text-xl font-semibold text-dark">
            {productsLoadFailed ? 'Catálogo temporariamente indisponível' : 'Nenhum produto encontrado nesta categoria'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            {productsLoadFailed
              ? 'Não foi possível carregar os produtos agora. Pode tentar novamente ou enviar-nos o briefing e ajudamos a encontrar a solução certa.'
              : 'Ainda não temos produtos publicados para este filtro. Pode ver todas as categorias ou pedir uma recomendação personalizada.'}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {activeCategory !== 'Todos' ? (
              <Link
                href="/catalogo"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-dark transition hover:border-brand hover:text-brand"
              >
                <RefreshCw className="h-4 w-4" />
                Ver todos os produtos
              </Link>
            ) : null}
            <Link
              href="/orcamento"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <Send className="h-4 w-4" />
              Pedir orçamento
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-brand px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>
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
