import type { CartItem, PortfolioItem, Product, ProductVariant } from './api';

export const DEFAULT_IMAGE_FALLBACK = '/images/screen-printing.jpg';

const PRODUCT_SLUG_FALLBACKS: Record<string, string> = {
  autocolantes: '/images/brand/product-sticker.jpg',
  'branding-de-viaturas': '/images/brand/product-vehicle.jpg',
  'camisetas-personalizadas': '/images/brand/product-tshirt.jpg',
  'cartoes-de-visita': '/images/brand/product-cards.jpg',
  rollups: '/images/brand/product-rollups.jpg',
  'bones-bordados': '/images/brand/product-cap.jpg',
  'camissete-polo': '/images/brand/product-tshirt.jpg',
  'gazebos-e-stands': '/images/brand/product-gazebo.jpg',
  'placas-de-identificacao': '/images/brand/product-sign.jpg',
};

const PORTFOLIO_SLUG_FALLBACKS: Record<string, string> = {
  'branding-de-frota-comercial': '/images/brand/portfolio-vehicle.jpg',
  'uniformes-corporativos-bordados': '/images/brand/portfolio-uniforms.jpg',
  'stand-para-feira-tecnologica': '/images/brand/portfolio-stand.jpg',
  'arc-flag': '/images/brand/portfolio-stand.jpg',
  'roll-up': '/images/brand/portfolio-rollup.jpg',
};

export function resolveImageSrc(src?: string | null, fallbackSrc = DEFAULT_IMAGE_FALLBACK) {
  if (!src) return fallbackSrc;
  return src;
}

export function getProductFallback(product?: Pick<Product, 'slug'> | null) {
  if (!product?.slug) return DEFAULT_IMAGE_FALLBACK;
  return PRODUCT_SLUG_FALLBACKS[product.slug] || DEFAULT_IMAGE_FALLBACK;
}

export function getProductImageSrc(
  product: Pick<Product, 'image' | 'slug'>,
  variant?: Pick<ProductVariant, 'image'> | null,
  fallbackSrc?: string
) {
  return resolveImageSrc(variant?.image || product.image, fallbackSrc || getProductFallback(product));
}

export function getCartItemImageSrc(item: Pick<CartItem, 'product_image' | 'product_slug'>) {
  const fallback = item.product_slug
    ? PRODUCT_SLUG_FALLBACKS[item.product_slug] || DEFAULT_IMAGE_FALLBACK
    : DEFAULT_IMAGE_FALLBACK;

  return resolveImageSrc(item.product_image, fallback);
}

export function getPortfolioImageSrc(item: Pick<PortfolioItem, 'image' | 'slug'>) {
  const fallback = PORTFOLIO_SLUG_FALLBACKS[item.slug] || DEFAULT_IMAGE_FALLBACK;
  return resolveImageSrc(item.image, fallback);
}
