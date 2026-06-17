import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const products = [
  { name: 'Rollups', image: '/images/brand/product-rollups.png', slug: 'rollups' },
  { name: 'Camisetas Personalizadas', image: '/images/brand/product-tshirt.png', slug: 'camisetas-personalizadas' },
  { name: 'Cartões de Visita', image: '/images/brand/product-cards.png', slug: 'cartoes-de-visita' },
  { name: 'Bonés Bordados', image: '/images/brand/product-cap.png', slug: 'bones-bordados' },
  { name: 'Placas de Identificação', image: '/images/brand/product-sign.png', slug: 'placas-de-identificacao' },
  { name: 'Autocolantes', image: '/images/brand/product-sticker.png', slug: 'autocolantes' },
  { name: 'Branding de Viaturas', image: '/images/brand/product-vehicle.png', slug: 'branding-de-viaturas' },
  { name: 'Gazebos e Stands', image: '/images/brand/product-gazebo.png', slug: 'gazebos-e-stands' },
];

export function FeaturedProducts() {
  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-dark md:text-4xl">Produtos em Destaque</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Os produtos mais pedidos pelas empresas moçambicanas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {products.map((product) => (
            <Link
              key={product.slug}
              href={`/catalogo/${product.slug}`}
              className="group overflow-hidden rounded-lg border border-gray-100 bg-white text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] bg-gray-50">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 12vw, (min-width: 768px) 25vw, 50vw"
                  className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex min-h-14 items-center justify-center px-2 py-3 text-sm font-semibold leading-tight text-dark">
                {product.name}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/catalogo">
            <Button variant="outline" className="gap-2">
              Ver todos os produtos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
