import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdminQuote } from '@/lib/admin-api';
import { ProposalReadView } from './ProposalReadView';
vi.mock('./ProposalPdfDocument', () => ({ ProposalPdfDocument: () => <p>Documento completo no espaço</p> }));

const quote = { reference: 'MP-0001-2026', status: 'reviewing', items: [{ id: 1, description: 'Cadernos personalizados', quantity: 200, unit_price: 100 }], subtotal: 20000, final_price: 18000, discount_type: 'percentage', discount_percentage: 10, discount_amount: 2000, tax_rate: 0, tax_amount: 0, estimated_delivery_days: 10, payment_option: 'deposit_50', terms: 'Após confirmação da arte', proposal_workflow: { stage_display: 'Devolvida para ajustes', version: 2, comment: 'Confirmar o acabamento' } } as AdminQuote;
describe('Proposal read view', () => {
  it('shows quantities, conditions, revision comments and totals without editing', () => {
    render(<ProposalReadView quote={quote} />);
    expect(screen.getByRole('cell', { name: '200' })).toBeInTheDocument();
    expect(screen.getByText('10 dias úteis')).toBeInTheDocument();
    expect(screen.getByText('Desconto (10%)')).toBeInTheDocument();
    expect(screen.getByText('50% adiantado + 50% na entrega')).toBeInTheDocument();
    expect(screen.getByText('Confirmar o acabamento')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('does not present an undefined quote price as a zero-priced offer', () => {
    render(<ProposalReadView quote={{ ...quote, final_price: undefined }} />);
    expect(screen.getByText('Preço por definir')).toBeInTheDocument();
  });
  it('loads the complete document only on request, without downloading', async () => {
    render(<ProposalReadView quote={quote} />);
    expect(screen.queryByText('Documento completo no espaço')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver documento completo no ecrã' }));
    expect(await screen.findByText('Documento completo no espaço')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar documento completo' }));
    expect(screen.queryByText('Documento completo no espaço')).not.toBeInTheDocument();
  });
});
