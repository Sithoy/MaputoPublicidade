import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Invoice } from '@/lib/api';
import { InvoiceDocument } from './InvoiceDocument';

describe('InvoiceDocument', () => {
  it('links the client document to its BrandDesk project and keeps fractional quantities', () => {
    const invoice: Invoice = {
      id: 1, reference: 'FT-2026-0001', order_reference: 'ORD-0001',
      client_name: 'Cliente', issue_date: '2026-10-10', due_date: '2026-10-25',
      status: 'issued', currency: 'MZN', subtotal: 250, discount_amount: 0,
      tax_rate: 0, tax_amount: 0, total: 250, amount_paid: 0, balance_due: 250,
      created_at: '2026-10-10T09:00:00Z',
      items: [{ id: 1, description: 'Vinil', quantity: 2.5, unit_price: 100, line_total: 250 }],
    };
    render(<InvoiceDocument invoice={invoice} audience="client" />);
    expect(screen.getByRole('link', { name: 'ORD-0001' })).toHaveAttribute('href', '/area-cliente/encomendas/ORD-0001');
    expect(screen.getByText(Number(2.5).toLocaleString('pt-MZ'))).toBeInTheDocument();
  });
});
