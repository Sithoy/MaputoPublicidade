import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductConfigurationFields } from './ProductConfigurationFields';
import { productCategoryName } from '@/lib/product-configuration';
import { MaterialBriefingSummary } from './MaterialBriefingSummary';

const product = { id: 1, slug: 'powerbank', name: 'Powerbank', description: '', category: 'Impressão UV', product_category_name: 'Eletrónica', configuration_template: 'electronics' as const, configuration_options: { capacity: ['20000 mAh'], color: ['Preto'] } };
describe('Category-led product configuration', () => {
  it('exposes only configured relevant fields and builds a technical snapshot', () => {
    const onChange = vi.fn();
    render(<ProductConfigurationFields product={product} id="test" onChange={onChange} />);
    expect(screen.queryByLabelText('Modelo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tamanhos')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Capacidade')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Capacidade'), { target: { value: '20000 mAh' } });
    expect(onChange).toHaveBeenCalledWith({ template: 'electronics', category: 'Eletrónica', selections: [{ key: 'capacity', label: 'Capacidade', value: '20000 mAh' }] });
  });
  it('keeps an older saved choice visible after catalogue options change', () => {
    const snapshot = { template: 'electronics' as const, selections: [{ key: 'capacity', label: 'Capacidade', value: '10000 mAh' }] };
    render(<ProductConfigurationFields product={product} value={snapshot} id="saved" onChange={() => {}} />);
    expect(screen.getByLabelText('Capacidade')).toHaveValue('10000 mAh');
    render(<MaterialBriefingSummary value={{ catalogue_configuration: snapshot }} />);
    expect(screen.getByText('Capacidade: 10000 mAh')).toBeInTheDocument();
  });
  it('does not present service categories as product categories', () => {
    expect(productCategoryName(product)).toBe('Eletrónica');
    expect(productCategoryName({ ...product, product_category_name: null })).toBe('Outros produtos');
  });
});
