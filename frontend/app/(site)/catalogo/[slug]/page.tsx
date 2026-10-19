import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { get, getList, type Product } from '@/lib/api';
import { getProductImageSrc } from '@/lib/image-fallbacks';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 60;

function absoluteImageUrl(src: string) {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }

  return `${siteUrl}${src}`;
}

export async function generateStaticParams() {
  try {
    const products = await getList<Product>('/api/products/', { next: { revalidate: 60 } });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params: pendingParams }: { params: Promise<{ slug: string }> }) {
  const params = await pendingParams;
  try {
    const product = await get<Product>(`/api/products/${params.slug}/`, { next: { revalidate: 60 } });
    return {
      title: `${product.name} | Maputo Publicidade`,
      description: product.description,
      openGraph: {
        title: `${product.name} | Maputo Publicidade`,
        description: product.description,
        images: [absoluteImageUrl(getProductImageSrc(product))],
      },
    };
  } catch {
    return { title: 'Produto | Maputo Publicidade' };
  }
}

export default async function ProductDetailPage({ params: pendingParams }: { params: Promise<{ slug: string }> }) {
  const params = await pendingParams;
  let product: Product | null = null;
  try {
    product = await get<Product>(`/api/products/${params.slug}/`, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }

  if (!product) notFound();

  const price = product.pricing_complexity === 'complex' ? undefined : product.starting_price ?? product.base_price ?? product.variants?.[0]?.price;
  const imageUrl = absoluteImageUrl(getProductImageSrc(product));

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: imageUrl,
    brand: {
      '@type': 'Brand',
      name: 'Maputo Publicidade',
    },
    ...(price != null ? { offers: {
      '@type': 'Offer',
      url: `${siteUrl}/catalogo/${product.slug}`,
      priceCurrency: 'MZN',
      price: price || '0',
    } } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <div className="bg-light"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/catalogo"
          className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-[#66736D] hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <ProductVariantSelector product={product} />
      </div></div>
    </>
  );
}
