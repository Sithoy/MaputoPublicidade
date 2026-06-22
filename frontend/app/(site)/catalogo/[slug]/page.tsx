import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
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
      <Link
        href="/catalogo"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao catálogo
      </Link>

      <ProductVariantSelector product={product} />
    </div>
  );
}
