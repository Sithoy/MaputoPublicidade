import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getList, type Product } from '@/lib/api';
import { getProductFallback, getProductImageSrc } from '@/lib/image-fallbacks';

const FEATURED_PRODUCT_LIMIT = 4;

async function getFeaturedProducts() {
  try {
    const featured = await getList<Product>('/api/products/?featured=true', {
      next: { revalidate: 60 },
    });

    if (featured.length >= FEATURED_PRODUCT_LIMIT) {
      return featured.slice(0, FEATURED_PRODUCT_LIMIT);
    }

    const products = await getList<Product>('/api/products/', {
      next: { revalidate: 60 },
    });
    const featuredIds = new Set(featured.map((product) => product.id));
    const remainingProducts = products.filter((product) => !featuredIds.has(product.id));

    return [...featured, ...remainingProducts].slice(0, FEATURED_PRODUCT_LIMIT);
  } catch {
    return [];
  }
}

function formatPrice(product: Product) {
  const activeVariant = product.variants?.find((variant) => variant.is_active !== false);
  const price = product.starting_price || product.base_price || activeVariant?.price;

  if (price == null) return 'Sob orçamento';

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return 'Sob orçamento';

  return `${product.has_variants ? 'Desde ' : ''}${numericPrice.toLocaleString('pt-MZ')} MZN`;
}

export async function FeaturedProducts() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-dark md:text-4xl">Produtos em Destaque</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Os produtos mais pedidos pelas empresas moçambicanas.
          </p>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {featuredProducts.map((product) => {
              const activeVariant = product.variants?.find((variant) => variant.is_active !== false);

              return (
                <Link
                  key={product.id}
                  href={`/catalogo/${product.slug}`}
                  className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] bg-gray-50">
                    <SafeImage
                      src={getProductImageSrc(product, activeVariant)}
                      fallbackSrc={getProductFallback(product)}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-contain p-5 transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex min-h-40 flex-col px-4 py-4">
                    {product.category ? <Badge className="mb-2 w-fit">{product.category}</Badge> : null}
                    <h3 className="text-base font-semibold leading-tight text-dark group-hover:text-brand">
                      {product.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
                      {product.description}
                    </p>
                    <p className="mt-auto pt-3 text-sm font-semibold text-dark">{formatPrice(product)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <h3 className="text-xl font-semibold text-dark">Catálogo em atualização</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Os produtos publicados aparecem aqui automaticamente assim que o catálogo fica disponível.
            </p>
            <div className="mt-5">
              <Link href="/catalogo">
                <Button variant="outline" className="gap-2">
                  Ver catálogo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {featuredProducts.length > 0 ? (
          <div className="mt-8 text-center">
            <Link href="/catalogo">
              <Button variant="outline" className="gap-2">
                Ver todos os produtos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
