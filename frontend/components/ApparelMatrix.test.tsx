import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ApparelMatrix } from './ApparelMatrix';
import type { ApparelDistribution } from '@/lib/apparel';
import { MaterialBriefingSummary } from './MaterialBriefingSummary';

function Example() {
  const [value, setValue] = useState<ApparelDistribution>({ pending: false, rows: [] });
  return <ApparelMatrix id="example" quantity={200} value={value} onChange={setValue} options={{ models: ['Masculino', 'Feminino'], colors: ['Verde'], sizes: ['M', 'L'] }} />;
}
describe('Apparel distribution', () => {
  it('totals 200 polos across model, color and size without generating manual lines', () => {
    render(<Example />);
    fireEvent.change(screen.getByLabelText('Masculino Verde M'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Feminino Verde L'), { target: { value: '100' } });
    expect(screen.getByRole('status')).toHaveTextContent('200 distribuídas / 200 pretendidas');
    fireEvent.change(screen.getByLabelText('Masculino Verde M'), { target: { value: '50' } });
    expect(screen.getByRole('status')).toHaveTextContent('Ajuste o mapa');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('status')).toHaveTextContent('Por confirmar');
  });
  it('shows the same distribution in a readable summary', () => {
    render(<MaterialBriefingSummary value={{ apparel: { pending: false, rows: [{ model: 'Feminino', color: 'Verde', size: 'L', quantity: 100 }], technique: 'Bordado', placement: 'Peito' } }} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Feminino')).toBeInTheDocument();
    expect(screen.getByText('Bordado · Peito')).toBeInTheDocument();
  });
});
