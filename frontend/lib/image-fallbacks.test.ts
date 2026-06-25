import { describe, expect, it } from 'vitest';
import { getPortfolioImageSrc, getProductImageSrc, resolveImageSrc } from './image-fallbacks';

describe('image fallback helpers', () => {
  it('maps known missing production media paths to bundled product assets', () => {
    expect(
      getProductImageSrc({
        slug: 'autocolantes',
        image: '/media/products/autocolantes.jpg',
      })
    ).toBe('/images/brand/product-sticker.png');
  });

  it('keeps unknown media paths so SafeImage can try them first', () => {
    expect(resolveImageSrc('/media/products/custom-upload.jpg', '/fallback.jpg')).toBe(
      '/media/products/custom-upload.jpg'
    );
  });

  it('maps known missing portfolio media paths to bundled portfolio assets', () => {
    expect(
      getPortfolioImageSrc({
        slug: 'roll-up',
        image: '/media/portfolio/Roll_UP_Emose.jfif',
      })
    ).toBe('/images/brand/portfolio-rollup.png');
  });
});
