import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BriefingDisclosure } from './BriefingDisclosure';

describe('BriefingDisclosure', () => {
  it('starts compact, opens by its summary and retains values when closed', async () => {
    render(<BriefingDisclosure title="Detalhes"><label>Medida<input defaultValue="85 cm" /></label></BriefingDisclosure>);
    const input = screen.getByLabelText('Medida');
    const summary = screen.getByText('Detalhes').closest('summary')!;
    expect(input).not.toBeVisible();
    fireEvent.click(summary);
    await waitFor(() => expect(input).toBeVisible());
    fireEvent.change(input, { target: { value: '200 cm' } });
    fireEvent.click(summary);
    await waitFor(() => expect(input).not.toBeVisible());
    expect(input).toHaveValue('200 cm');
  });
  it('shows previously supplied information immediately', () => {
    render(<BriefingDisclosure title="Detalhes" defaultOpen><label>Medida<input defaultValue="85 cm" /></label></BriefingDisclosure>);
    expect(screen.getByLabelText('Medida')).toBeVisible();
  });
  it('reveals controls that fail native form validation', async () => {
    render(<BriefingDisclosure title="Materiais"><label>Quantidade<input required type="number" /></label></BriefingDisclosure>);
    fireEvent.invalid(screen.getByLabelText('Quantidade'));
    await waitFor(() => expect(screen.getByLabelText('Quantidade')).toBeVisible());
  });
});
