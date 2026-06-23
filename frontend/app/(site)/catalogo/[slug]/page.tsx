import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { get, type Product } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
    return {
      title: `${product.name} | Maputo Publicidade`,
      description: product.description,
      openGraph: {
        title: `${product.name} | Maputo Publicidade`,
        description: product.description,
        images: product.image ? [`${siteUrl}${product.image}`] : [`${siteUrl}/og-image.png`],
      },
    };
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

  const price = product.starting_price || product.base_price || product.variants?.[0]?.price;
  const imageUrl = product.image ? `${siteUrl}${product.image}` : `${siteUrl}/og-image.png`;

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
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/catalogo/${product.slug}`,
      priceCurrency: 'MZN',
      price: price || '0',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
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
    </>
  );
}
