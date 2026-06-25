'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, ShoppingCart } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AddToCartModal } from '@/components/AddToCartModal';
import { getProductFallback, getProductImageSrc } from '@/lib/image-fallbacks';
import type { Product, ProductVariant } from '@/lib/api';

export function ProductVariantSelector({ product }: { product: Product }) {
  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((v) => v.is_active !== false),
    [product.variants]
  );

  const [selected, setSelected] = useState<ProductVariant | null>(activeVariants[0] ?? null);
  const [cartOpen, setCartOpen] = useState(false);

  const displayImage = getProductImageSrc(product, selected);
  const fallbackImage = getProductFallback(product);
  const displayPrice = selected?.price || product.starting_price || product.base_price;

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
          <SafeImage
            src={displayImage}
            fallbackSrc={fallbackImage}
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

          {activeVariants.length > 0 && (
            <div>
              <label htmlFor="variant" className="mb-2 block text-sm font-semibold text-dark">
                Escolha uma opção
              </label>
              <select
                id="variant"
                value={selected?.id ?? ''}
                onChange={(e) => {
                  const variant = activeVariants.find((v) => v.id === Number(e.target.value));
                  setSelected(variant || null);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {activeVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} — {variant.price.toLocaleString()} MZN
                  </option>
                ))}
              </select>
            </div>
          )}

          <Card>
            <CardContent className="space-y-3">
              {displayPrice && (
                <div>
                  <span className="text-sm font-semibold text-dark">Preço:</span>
                  <p className="text-2xl font-bold text-brand">
                    {selected ? '' : activeVariants.length > 1 ? 'Desde ' : ''}
                    {displayPrice.toLocaleString()} MZN
                  </p>
                </div>
              )}
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
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1 gap-2" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-5 w-5" />
              Adicionar ao carrinho
            </Button>
            <a
              href={`https://wa.me/25882555736?text=${encodeURIComponent(
                `Olá! Gostaria de pedir um orçamento para ${product.name}${
                  selected ? ` (${selected.name})` : ''
                }.`
              )}`}
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

      <AddToCartModal product={product} variant={selected} open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
