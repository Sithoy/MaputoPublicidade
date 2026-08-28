import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InvoiceTermsCard } from './InvoiceTermsCard';

describe('InvoiceTermsCard', () => {
  it('renders the financial controls and calculated summary', () => {
    render(
      <InvoiceTermsCard
        issueDate="2026-08-28"
        dueDate="2026-09-12"
        discount="100"
        taxRate="16"
        notes=""
        terms=""
        subtotal={1200}
        onIssueDateChange={vi.fn()}
        onDueDateChange={vi.fn()}
        onDiscountChange={vi.fn()}
        onTaxRateChange={vi.fn()}
        onNotesChange={vi.fn()}
        onTermsChange={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Condições financeiras' })).toBeInTheDocument();
    expect(screen.getByLabelText('Data de emissão *')).toHaveValue('2026-08-28');
    expect(screen.getByLabelText('Vencimento *')).toHaveValue('2026-09-12');
    expect(screen.getByLabelText('Desconto (MZN)')).toHaveValue(100);
    expect(screen.getByLabelText('IVA (%)')).toHaveValue(16);
    expect(screen.getByText('1276 MZN')).toBeInTheDocument();
  });
});
