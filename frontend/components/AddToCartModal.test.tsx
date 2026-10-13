import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddToCartModal } from './AddToCartModal';

vi.mock('@/lib/client-api', () => ({ addCartItem: vi.fn() }));
describe('Catalogue personalization dialog', () => {
  it('keeps an unconfigured inherited apparel grid pending instead of inventing sizes', () => {
    render(<AddToCartModal product={{ id: 1, slug: 'polo', name: 'Polo', description: '', order_template: 'apparel', apparel_options: { models: [], colors: [], sizes: [] } }} open onClose={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /Distribuição por confirmar/ })).toBeChecked();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('labels the dialog, locks scrolling, closes with Escape and restores focus', () => {
    const close = vi.fn();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<AddToCartModal product={{ id: 1, slug: 'polo', name: 'Polo', description: '', min_quantity: 20 }} open onClose={close} />);
    expect(screen.getByRole('dialog', { name: 'Dê-lhe a sua identidade.' })).toHaveFocus();
    expect(screen.getByLabelText('Quantidade')).toHaveValue(20);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
    trigger.remove();
  });
});
