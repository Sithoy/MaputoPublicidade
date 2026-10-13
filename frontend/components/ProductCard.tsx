'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { getProductFallback, getProductImageSrc } from '@/lib/image-fallbacks';
import type { Product } from '@/lib/api';

export function ProductCard({ product }: { product: Product }) {
  const firstVariant = product.variants?.find(v => v.is_active !== false);
  const price = product.pricing_complexity === 'complex' ? undefined : product.starting_price ?? product.base_price;
  const currency = new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 2 });
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3E8E4] bg-white transition duration-200 hover:border-[#B3D8C3] hover:shadow-[0_16px_40px_-24px_rgba(6,63,43,0.3)]">
      <Link href={`/catalogo/${product.slug}`} aria-label={`Ver ${product.name}`} className="relative block aspect-[1.15] overflow-hidden bg-[#F3F5F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <SafeImage src={getProductImageSrc(product, firstVariant)} fallbackSrc={getProductFallback(product)} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw" className="object-contain p-6 transition-transform duration-300 motion-safe:group-hover:scale-105" />
        {product.order_template === 'apparel' ? <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-[10px] font-bold text-brand-800">Por modelo, cor e tamanho</span> : null}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#66736D]">{product.category || 'Personalizado para a sua marca'}</p>
        <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight text-brand-800"><Link href={`/catalogo/${product.slug}`} className="hover:underline">{product.name}</Link></h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#66736D]">{product.description}</p>
        <div className="mt-auto pt-5">
          <p className="text-sm font-bold text-dark">{price != null ? `${product.has_variants ? 'Desde ' : ''}${currency.format(price)} MZN` : 'Sob consulta'}</p>
          <p className="mt-1 text-xs text-[#66736D]">{product.min_quantity ? `Pedido mínimo: ${product.min_quantity} ${product.min_quantity === 1 ? 'unidade' : 'unidades'}` : 'Proposta personalizada'}</p>
          <Link href={`/catalogo/${product.slug}`} className="mt-4 flex items-center justify-between border-t border-[#E3E8E4] pt-4 text-xs font-bold text-brand-800 hover:text-brand">Conheça e personalize <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </article>
  );
}
