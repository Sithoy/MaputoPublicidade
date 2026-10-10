import type { Invoice, Quote } from '@/lib/api';
import { InvoiceDocument } from './InvoiceDocument';

export function ProposalDocument({ quote, audience = 'admin' }: { quote: Quote; audience?: 'admin' | 'client' }) {
  const subtotal = Number(quote.subtotal ?? quote.items.reduce((sum, item) => sum + Number(item.unit_price || 0) * item.quantity, 0));
  const total = Number(quote.final_price ?? quote.estimated_price ?? subtotal);
  const document: Invoice = {
    id: quote.id, reference: quote.reference, order_reference: quote.order_reference,
    client_name: quote.client_name, client_company: quote.client_company, client_email: quote.client_email,
    client_phone: quote.client_phone, client_nuit: quote.client_nuit, billing_address: quote.billing_address,
    issue_date: quote.created_at.slice(0, 10), due_date: quote.valid_until || '',
    status: 'draft', currency: 'MZN', subtotal, total,
    discount_type: quote.discount_type, discount_percentage: Number(quote.discount_percentage || 0),
    discount_amount: Number(quote.discount_amount || 0), tax_rate: Number(quote.tax_rate || 0), tax_amount: Number(quote.tax_amount || 0),
    amount_paid: 0, balance_due: 0, terms: quote.terms || 'Sujeita à confirmação de disponibilidade, especificações finais e aprovação do cliente.', notes: quote.notes,
    items: quote.items.map((item) => ({ id: item.id, description: [item.description, [item.size, item.material, item.colors].filter(Boolean).join(' · '), item.notes].filter(Boolean).join('\n'), quantity: item.quantity, unit_price: Number(item.unit_price || 0), line_total: Number(item.unit_price || 0) * item.quantity })),
    created_at: quote.created_at,
  };
  return <InvoiceDocument invoice={document} proposal={quote} audience={audience} />;
}
