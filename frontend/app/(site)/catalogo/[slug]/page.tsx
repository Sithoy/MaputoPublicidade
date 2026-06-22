import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { get, type Product } from '@/lib/api';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const products = await get<Product[]>('/api/products/', { next: { revalidate: 60 } });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const product = await get<Product>(`/api/products/${params.slug}/`, { next: { revalidate: 60 } });
    return { title: `${product.name} | Maputo Publicidade`, description: product.description };
  } catch {
    return { title: 'Produto | Maputo Publicidade' };
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  let product: Product | null = null;
  try {
    product = await get<Product>(`/api/products/${params.slug}/`, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6 lg:py-24">
      <Link href="/catalogo" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao catálogo
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
          <Image
            src={product.image || '/images/screen-printing.jpg'}
            alt={product.name}
            fill
            className="object-contain p-8"
            priority
          />
        </div>

        <div className="space-y-6">
          <div>
            <Badge className="mb-3">{product.category}</Badge>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">{product.name}</h1>
            <p className="mt-3 text-gray-600">{product.description}</p>
          </div>

          <Card>
            <CardContent className="space-y-3">
              {product.materials && product.materials.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-dark">Materiais:</span>
                  <p className="text-sm text-gray-600">{product.materials.join(', ')}</p>
                </div>
              )}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-dark">Tamanhos:</span>
                  <p className="text-sm text-gray-600">{product.sizes.join(', ')}</p>
                </div>
              )}
              {product.min_quantity && (
                <div>
                  <span className="text-sm font-semibold text-dark">Quantidade mínima:</span>
                  <p className="text-sm text-gray-600">{product.min_quantity} unidades</p>
                </div>
              )}
              {product.lead_time && (
                <div>
                  <span className="text-sm font-semibold text-dark">Prazo estimado:</span>
                  <p className="text-sm text-gray-600">{product.lead_time}</p>
                </div>
              )}
              {product.base_price && (
                <div>
                  <span className="text-sm font-semibold text-dark">Preço base:</span>
                  <p className="text-sm text-gray-600">{product.base_price.toLocaleString()} MZN</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/orcamento?produto=${product.slug}`} className="flex-1">
              <Button size="lg" className="w-full gap-2">
                <FileText className="h-5 w-5" />
                Pedir orçamento deste produto
              </Button>
            </Link>
            <a
              href={`https://wa.me/25882555736?text=${encodeURIComponent(`Olá! Gostaria de pedir um orçamento para ${product.name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button size="lg" variant="accent" className="w-full gap-2">
                <MessageCircle className="h-5 w-5" />
                Perguntar pelo WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
