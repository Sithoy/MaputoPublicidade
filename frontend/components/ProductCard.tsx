'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AddToCartModal } from '@/components/AddToCartModal';
import type { Product } from '@/lib/api';

export function ProductCard({ product }: { product: Product }) {
  const [cartOpen, setCartOpen] = useState(false);
  const firstVariant = product.variants?.find((v) => v.is_active !== false);
  const displayImage = firstVariant?.image || product.image || '/images/screen-printing.jpg';
  const displayPrice = product.starting_price || product.base_price;

  return (
    <>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <Link href={`/catalogo/${product.slug}`}>
          <div className="relative aspect-[4/3] bg-gray-50">
            <Image
              src={displayImage}
              alt={product.name}
              fill
              className="object-contain p-6"
            />
          </div>
        </Link>
        <CardContent>
          <Badge className="mb-2">{product.category}</Badge>
          <Link href={`/catalogo/${product.slug}`}>
            <h2 className="mb-1 text-lg font-semibold text-dark hover:text-brand">{product.name}</h2>
          </Link>
          <p className="mb-2 line-clamp-2 text-sm text-gray-600">{product.description}</p>
          {displayPrice ? (
            <p className="mb-4 text-sm font-semibold text-dark">
              {product.has_variants ? 'Desde ' : ''}
              {displayPrice.toLocaleString()} MZN
            </p>
          ) : null}
          <div className="flex gap-2">
            <Link href={`/catalogo/${product.slug}`} className="flex-1">
              <Button variant="outline" className="w-full">Ver detalhes</Button>
            </Link>
            <Button variant="outline" onClick={() => setCartOpen(true)} className="px-3">
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddToCartModal product={product} variant={firstVariant} open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
