import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Product } from '@/lib/api';
import { DocumentItemsEditor, type EditableDocumentLine } from './DocumentItemsEditor';

const line: EditableDocumentLine = { key: 'custom', description: 'Polos de campanha', quantity: '200', unit_price: '' };
const products: Product[] = [{ id: 1, slug: 'powerbank', name: 'Powerbank', description: '', configuration_template: 'electronics', configuration_options: { capacity: ['20000 mAh'] } }];

function Example({ initial = [line] }: { initial?: EditableDocumentLine[] }) {
  const [lines, setLines] = useState(initial);
  return <><DocumentItemsEditor lines={lines} onChange={setLines} products={products} priceOptional /><output data-testid="lines">{JSON.stringify(lines)}</output></>;
}
const savedLine = () => JSON.parse(screen.getByTestId('lines').textContent!)[0] as EditableDocumentLine;

describe('Custom document item configurations', () => {
  it('opens the full apparel flow for a custom item and stores 200 polos without a catalogue product', () => {
    render(<Example />);
    expect(screen.queryByRole('region', { name: 'Distribuição de vestuário' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Modelo de configuração'), { target: { value: 'apparel' } });
    const matrix = within(screen.getByRole('region', { name: 'Distribuição de vestuário' }));
    fireEvent.change(matrix.getByLabelText('Cores pretendidas, separadas por vírgula'), { target: { value: 'Verde' } });
    fireEvent.change(matrix.getByLabelText('Masculino Verde M'), { target: { value: '120' } });
    fireEvent.change(matrix.getByLabelText('Feminino Verde L'), { target: { value: '80' } });
    fireEvent.change(matrix.getByLabelText('Personalização'), { target: { value: 'Bordado' } });
    fireEvent.change(matrix.getByLabelText('Posição do logótipo'), { target: { value: 'Peito' } });
    fireEvent.click(matrix.getByRole('checkbox'));
    expect(matrix.getByRole('status')).toHaveTextContent('200 distribuídas / 200 pretendidas');
    expect(savedLine()).toMatchObject({ description: line.description, quantity: '200', material_briefing: {
      work_type: 'apparel', apparel: { pending: false, technique: 'Bordado', placement: 'Peito', rows: [
        { model: 'Masculino', color: 'Verde', size: 'M', quantity: 120 },
        { model: 'Feminino', color: 'Verde', size: 'L', quantity: 80 },
      ] },
    } });
    expect(savedLine().product_id).toBeUndefined();
  });

  it('shows only the selected technical fields and retains multiple selections', () => {
    render(<Example />);
    fireEvent.change(screen.getByLabelText('Modelo de configuração'), { target: { value: 'electronics' } });
    fireEvent.change(screen.getByLabelText('Capacidade'), { target: { value: '20000 mAh' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: 'USB-C' } });
    expect(screen.queryByLabelText('Papel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Formato / dimensões')).not.toBeInTheDocument();
    expect(savedLine().material_briefing?.catalogue_configuration).toEqual({ template: 'electronics', selections: [
      { key: 'model', label: 'Modelo', value: 'USB-C' }, { key: 'capacity', label: 'Capacidade', value: '20000 mAh' },
    ] });
  });

  it('clears incompatible specifications while preserving unrelated briefing and base item details', () => {
    render(<Example initial={[{ ...line, material_briefing: { needs_visit: true, visit_notes: 'Confirmar local', work_type: 'apparel', apparel: { pending: true, rows: [] } } }]} />);
    fireEvent.change(screen.getByLabelText('Modelo de configuração'), { target: { value: 'banner' } });
    expect(screen.queryByRole('region', { name: 'Distribuição de vestuário' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Formato / dimensões')).toBeInTheDocument();
    expect(savedLine()).toMatchObject({ description: line.description, quantity: '200', material_briefing: { needs_visit: true, visit_notes: 'Confirmar local', catalogue_configuration: { template: 'banner', selections: [] } } });
    expect(savedLine().material_briefing?.work_type).toBeUndefined();
    expect(savedLine().material_briefing?.apparel).toBeUndefined();
    fireEvent.change(screen.getByLabelText('Modelo de configuração'), { target: { value: 'standard' } });
    expect(savedLine().material_briefing).toEqual({ needs_visit: true, visit_notes: 'Confirmar local' });
  });

  it('restores custom apparel and other model selections when editing existing lines', () => {
    render(<Example initial={[{ ...line, material_briefing: { work_type: 'apparel', apparel: { pending: false, rows: [{ model: 'Unissexo', color: 'Branco', size: 'M', quantity: 200 }] } } },
      { ...line, key: 'second', material_briefing: { catalogue_configuration: { template: 'stationery', selections: [{ key: 'paper', label: 'Papel', value: 'Couché' }] } } }]} />);
    expect(screen.getAllByLabelText('Modelo de configuração').map(select => (select as HTMLSelectElement).value)).toEqual(['apparel', 'stationery']);
    expect(screen.getByLabelText('Unissexo Branco M')).toHaveValue(200);
    expect(screen.getByLabelText('Papel')).toHaveValue('Couché');
    fireEvent.change(screen.getByLabelText('Formato'), { target: { value: 'A5' } });
    expect(screen.getByLabelText('Papel')).toHaveValue('Couché');
  });

  it('keeps catalogue configuration controlled by the selected product and can return to a custom item', () => {
    render(<Example />);
    fireEvent.change(screen.getByLabelText('Produto'), { target: { value: '1' } });
    expect(screen.queryByLabelText('Modelo de configuração')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Capacidade'), { target: { value: '20000 mAh' } });
    expect(savedLine()).toMatchObject({ product_id: 1, material_briefing: { catalogue_configuration: { template: 'electronics', selections: [{ key: 'capacity', value: '20000 mAh' }] } } });
    fireEvent.change(screen.getByLabelText('Produto'), { target: { value: '' } });
    expect(screen.getByLabelText('Modelo de configuração')).toHaveValue('standard');
    expect(savedLine().product_id).toBeUndefined();
  });
});
