import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueBrowser } from './CatalogueBrowser';
import { ProductVariantSelector } from './ProductVariantSelector';
import type { Product } from '@/lib/api';

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }), usePathname: () => '/catalogo', useSearchParams: () => new URLSearchParams() }));
vi.mock('./SafeImage', () => ({ SafeImage: ({ alt }: { alt: string }) => <span>{alt} imagem</span> }));
vi.mock('./AddToCartModal', () => ({ AddToCartModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Personalização</div> : null }));

const products: Product[] = [
  { id: 1, slug: 'polo', name: 'Polo de algodão', description: 'Uniformes para a equipa', category: 'Vestuário', base_price: 500, min_quantity: 20, variants: [{ id: 4, name: 'Algodão', price: 500 }, { id: 5, name: 'Premium', price: 700 }, { id: 6, name: 'Antiga', price: 400, is_active: false }] },
  { id: 2, slug: 'rollup', name: 'Rollup', description: 'Para eventos', category: 'Impressão' },
];
beforeEach(() => vi.clearAllMocks());
describe('Catalogue experience', () => {
  it('uses published categories and searches without requiring accents', () => {
    render(<CatalogueBrowser products={products} />);
    expect(screen.getByRole('link', { name: 'Vestuário' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'algodao' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 produto');
    expect(screen.queryByRole('heading', { name: 'Rollup' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Impressão' })).toHaveAttribute('href', '/catalogo?categoria=Impress%C3%A3o&q=algodao#produtos');
  });
  it('filters deep-linked categories and resets empty results', () => {
    render(<CatalogueBrowser products={products} category="Vestuário" />);
    expect(screen.getByRole('link', { name: 'Vestuário' })).toHaveAttribute('aria-current', 'page');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nenhum' } });
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(push).toHaveBeenCalledWith('/catalogo#produtos', { scroll: false });
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
  it('offers retry when the backend is unavailable', () => {
    render(<CatalogueBrowser products={[]} failed />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refresh).toHaveBeenCalled();
  });
  it('selects a variant before opening personalization', () => {
    render(<ProductVariantSelector product={products[0]} />);
    expect(screen.queryByRole('button', { name: /Antiga/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Premium/ }));
    expect(screen.getByRole('button', { name: /Premium/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Personalize o seu pedido' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('does not expose old variant prices for a product sold under consultation', () => {
    render(<ProductVariantSelector product={{ ...products[0], pricing_complexity: 'complex' }} />);
    expect(screen.getByText('Sob consulta')).toBeInTheDocument();
    expect(screen.getAllByText('Valor na proposta')).toHaveLength(2);
    expect(screen.queryByText('500 MZN')).not.toBeInTheDocument();
    expect(screen.queryByText('700 MZN')).not.toBeInTheDocument();
  });
});
