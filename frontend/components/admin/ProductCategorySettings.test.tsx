import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductCategorySettings } from './ProductCategorySettings';

const { list, save } = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/admin-api', () => ({ getProductCategories: list, saveProductCategory: save }));
beforeEach(() => { vi.clearAllMocks(); list.mockResolvedValue([{ id: 1, name: 'Eletrónica', slug: 'electronica', configuration_template: 'electronics', is_active: true }]); save.mockResolvedValue({ id: 1 }); });
describe('Product category settings', () => {
  it('edits the template and archives a category without touching product records', async () => {
    render(<ProductCategorySettings />);
    fireEvent.click(await screen.findByRole('button', { name: /Eletrónica.*Ativa/ }));
    expect(screen.getByLabelText('Modelo de configuração')).toHaveValue('electronics');
    fireEvent.change(screen.getByLabelText('Modelo de configuração'), { target: { value: 'banner' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar categoria' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ configuration_template: 'banner', is_active: false }), 'electronica'));
    expect(await screen.findByRole('status')).toHaveTextContent('Produtos existentes não foram alterados');
  });
  it('preserves the category draft when saving fails', async () => {
    save.mockRejectedValue(new Error('Falha ao guardar'));
    render(<ProductCategorySettings />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Brindes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar categoria' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao guardar');
    expect(screen.getByLabelText('Nome')).toHaveValue('Brindes');
  });
});
