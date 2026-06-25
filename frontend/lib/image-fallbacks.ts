import type { CartItem, PortfolioItem, Product, ProductVariant } from './api';

export const DEFAULT_IMAGE_FALLBACK = '/images/screen-printing.jpg';

const PRODUCT_SLUG_FALLBACKS: Record<string, string> = {
  autocolantes: '/images/brand/product-sticker.png',
  'branding-de-viaturas': '/images/brand/product-vehicle.png',
  'camisetas-personalizadas': '/images/brand/product-tshirt.png',
  'cartoes-de-visita': '/images/brand/product-cards.png',
  rollups: '/images/brand/product-rollups.png',
  'bones-bordados': '/images/brand/product-cap.png',
  'camissete-polo': '/images/brand/product-tshirt.png',
  'gazebos-e-stands': '/images/brand/product-gazebo.png',
  'placas-de-identificacao': '/images/brand/product-sign.png',
};

const MEDIA_PATH_FALLBACKS: Record<string, string> = {
  '/media/products/autocolantes.jpg': PRODUCT_SLUG_FALLBACKS.autocolantes,
  '/media/products/branding-de-viaturas.jpg': PRODUCT_SLUG_FALLBACKS['branding-de-viaturas'],
  '/media/products/camisetas-personalizadas.jpg': PRODUCT_SLUG_FALLBACKS['camisetas-personalizadas'],
  '/media/products/cartoes-de-visita.jpg': PRODUCT_SLUG_FALLBACKS['cartoes-de-visita'],
  '/media/products/rollups.jpg': PRODUCT_SLUG_FALLBACKS.rollups,
  '/media/products/rollup.jpg': PRODUCT_SLUG_FALLBACKS.rollups,
  '/media/products/bones-bordados.jpg': PRODUCT_SLUG_FALLBACKS['bones-bordados'],
  '/media/products/Cap_Az6xFnq.jpeg': PRODUCT_SLUG_FALLBACKS['bones-bordados'],
  '/media/products/Cap.jpeg': PRODUCT_SLUG_FALLBACKS['bones-bordados'],
  '/media/products/Polo_Branca_masdculina_100_algodao_-_1635mzn.jpg':
    PRODUCT_SLUG_FALLBACKS['camissete-polo'],
  '/media/products/gazebos-e-stands.jpg': PRODUCT_SLUG_FALLBACKS['gazebos-e-stands'],
  '/media/products/placas-de-identificacao.jpg': PRODUCT_SLUG_FALLBACKS['placas-de-identificacao'],
  '/media/portfolio/Arc_Flag_-_INCM.jfif': '/images/brand/portfolio-stand.png',
  '/media/portfolio/Roll_UP_Emose.jfif': '/images/brand/portfolio-rollup.png',
};

const PORTFOLIO_SLUG_FALLBACKS: Record<string, string> = {
  'branding-de-frota-comercial': '/images/brand/portfolio-vehicle.png',
  'uniformes-corporativos-bordados': '/images/brand/portfolio-uniforms.png',
  'stand-para-feira-tecnologica': '/images/brand/portfolio-stand.png',
  'arc-flag': '/images/brand/portfolio-stand.png',
  'roll-up': '/images/brand/portfolio-rollup.png',
};

function getPathname(src: string) {
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  try {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return new URL(src).pathname;
    }
  } catch {
    return src;
  }

  return src.startsWith('/') ? src : `/${src}`;
}

export function resolveImageSrc(src?: string | null, fallbackSrc = DEFAULT_IMAGE_FALLBACK) {
  if (!src) return fallbackSrc;

  const pathname = getPathname(src);
  return MEDIA_PATH_FALLBACKS[pathname] || src;
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
