import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Quote } from '@/lib/api';
import { ProposalDocument } from './ProposalDocument';

describe('ProposalDocument', () => {
  it('labels an exemption explicitly instead of showing IVA 0%', () => {
    const quote = { id: 3, reference: 'MP-0003-2026', client_name: 'Empresa', created_at: '2026-10-10T09:00:00Z', status: 'quoted',
      vat_exempt: true, tax_rate: 0, tax_amount: 0, final_price: 1000, items: [{ id: 1, description: 'Polos', quantity: 10, unit_price: 100 }],
    } as unknown as Quote;
    render(<ProposalDocument quote={quote} />);
    expect(screen.getByText('Isento de IVA')).toBeInTheDocument();
    expect(screen.queryByText('IVA (0%)')).not.toBeInTheDocument();
  });
  it('does not present missing prices as free items or a zero advance', () => {
    const quote = { id: 2, reference: 'MP-0002-2026', client_name: 'Maria', created_at: '2026-10-10T09:00:00Z', status: 'received',
      items: [{ id: 1, description: 'Vinil', quantity: 1, unit_price: null }],
    } as unknown as Quote;
    render(<ProposalDocument quote={quote} />);
    expect(screen.getAllByText('A definir')).toHaveLength(3);
    expect(screen.queryByText(/Adiantamento previsto/)).not.toBeInTheDocument();
  });
  it('shows commercial conditions, banking and a percentage discount without debt', () => {
    const quote = { id: 1, reference: 'MP-0001-2026', client_name: 'Empresa ABC', client_email: 'abc@example.com',
      billing_address: 'Av. Eduardo Mondlane', client_nuit: '400123456', created_at: '2026-10-10T09:00:00Z', valid_until: '2026-10-25',
      status: 'quoted', payment_option: 'deposit_50', estimated_delivery_days: 7, commercial_pricing: true,
      subtotal: 1000, discount_type: 'percentage', discount_percentage: 10, discount_amount: 100,
      tax_rate: 16, tax_amount: 144, final_price: 1044,
      items: [{ id: 1, description: 'Roll-up', quantity: 2, unit_price: 500, notes: 'Acabamento mate', size: '85x200' }],
    } as Quote;
    render(<ProposalDocument quote={quote} />);
    expect(screen.getByText('Proposta comercial')).toBeInTheDocument();
    expect(screen.getByText('Validade')).toBeInTheDocument();
    expect(screen.getByText('Desconto (10%)')).toBeInTheDocument();
    expect(screen.getByText('Dados bancários')).toBeInTheDocument();
    expect(screen.getByText(/Adiantamento previsto/)).toHaveTextContent('522 MZN');
    expect(screen.getByText(/Acabamento mate/)).toHaveTextContent('85x200');
    expect(screen.queryByText(/Em dívida|Valor pago|Vencimento/)).not.toBeInTheDocument();
  });
});
