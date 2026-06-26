import { describe, expect, it } from 'vitest';
import { getPortfolioImageSrc, getProductImageSrc, resolveImageSrc } from './image-fallbacks';

describe('image fallback helpers', () => {
  it('keeps product media paths so real uploaded images are attempted first', () => {
    expect(
      getProductImageSrc({
        slug: 'autocolantes',
        image: '/media/products/autocolantes.jpg',
      })
    ).toBe('/media/products/autocolantes.jpg');
  });

  it('keeps unknown media paths so SafeImage can try them first', () => {
    expect(resolveImageSrc('/media/products/custom-upload.jpg', '/fallback.jpg')).toBe(
      '/media/products/custom-upload.jpg'
    );
  });

  it('keeps portfolio media paths so real uploaded images are attempted first', () => {
    expect(
      getPortfolioImageSrc({
        slug: 'roll-up',
        image: '/media/portfolio/Roll_UP_Emose.jfif',
      })
    ).toBe('/media/portfolio/Roll_UP_Emose.jfif');
  });
});
