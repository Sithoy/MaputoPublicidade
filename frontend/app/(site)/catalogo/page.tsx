import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { get, type Product } from '@/lib/api';
import { mainServices } from '@/lib/service-catalog';

const categories = ['Todos', ...mainServices.map((service) => service.title)];

export const metadata = {
  title: 'Catálogo | Maputo Publicidade',
  description: 'Explore o catálogo de produtos personalizáveis da Maputo Publicidade.',
};

export const revalidate = 60;

export default async function CatalogPage({ searchParams }: { searchParams: { categoria?: string } }) {
  const activeCategory = searchParams.categoria || 'Todos';
  let products: Product[] = [];

  try {
    products = await get<Product[]>('/api/products/', { next: { revalidate: 60 } });
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
            <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative aspect-[4/3] bg-gray-50">
                <Image
                  src={product.image || '/images/screen-printing.jpg'}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                />
              </div>
              <CardContent>
                <Badge className="mb-2">{product.category}</Badge>
                <h2 className="mb-1 text-lg font-semibold text-dark">{product.name}</h2>
                <p className="mb-4 line-clamp-2 text-sm text-gray-600">{product.description}</p>
                <Link href={`/catalogo/${product.slug}`}>
                  <Button variant="outline" className="w-full">Ver detalhes</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
