import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { mainServices } from '@/lib/service-catalog';
import { ServiceGallery } from './ServiceGallery';
import { ServicesSection } from './ServicesSection';
import ServicesPage from '@/app/(site)/servicos/page';

vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <span role="img" aria-label={alt} data-src={src} /> }));

describe('Premium service presentation', () => {
  it('uses distinct MP-branded illustrative assets for all six services', () => {
    expect(new Set(mainServices.map((service) => service.image)).size).toBe(6);
    for (const service of mainServices) {
      expect(service.image).toMatch(/\/images\/services\/.+-mp\.webp$/);
      expect(service.imageAlt).toContain('Mockup ilustrativo');
      expect(service.imageAlt).toContain('Maputo Publicidade');
    }
  });
  it('shows six unique, directly accessible services without autoplay controls', () => {
    render(<ServiceGallery />);
    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    for (const service of mainServices) {
      expect(screen.getByRole('link', { name: new RegExp(service.eyebrow) })).toHaveAttribute('href', `/servicos/${service.slug}`);
      expect(screen.getByRole('img', { name: service.imageAlt })).toHaveAttribute('data-src', service.image);
      expect(existsSync(resolve(process.cwd(), `public${service.image}`))).toBe(true);
    }
    expect(screen.getByText(/Imagens ilustrativas/)).toBeInTheDocument();
  });
  it('keeps the landing-page introduction focused on client outcomes', () => {
    render(<ServicesSection />);
    expect(screen.getByRole('heading', { name: 'Como podemos ajudar a sua marca a avançar?' })).toHaveAttribute('id', 'services-heading');
    expect(screen.getByRole('link', { name: 'Conheça as nossas soluções' })).toHaveAttribute('href', '/servicos');
    expect(screen.getAllByRole('img')).toHaveLength(6);
  });
  it('shares the same imagery and gives the services page a project CTA', () => {
    render(<ServicesPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A sua marca.Bem representada.');
    expect(screen.getByRole('link', { name: 'Fale sobre o seu projeto' })).toHaveAttribute('href', '/orcamento');
    expect(screen.getAllByRole('img')).toHaveLength(6);
  });
});
