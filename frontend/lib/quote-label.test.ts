import { describe, expect, it } from 'vitest';
import type { Quote } from './api';
import { quoteLabel } from './quote-label';

function quoteWith(data: Partial<Quote>): Quote {
  return {
    id: 1,
    reference: 'MP-0001-2026',
    client_name: 'Cliente Teste',
    client_email: 'cliente@example.com',
    status: 'received',
    created_at: '2026-08-29T00:00:00Z',
    items: [],
    ...data,
  };
}

describe('quoteLabel', () => {
  it('uses the item count when the compact list response omits items', () => {
    const quote = quoteWith({
      items: undefined as unknown as Quote['items'],
      item_count: 2,
    });

    expect(quoteLabel(quote)).toBe('2 itens solicitados');
  });

  it('uses the item description when item details are available', () => {
    const quote = quoteWith({
      items: [
        {
          id: 1,
          description: 'Cartões de visita',
          quantity: 500,
        },
      ],
    });

    expect(quoteLabel(quote)).toBe('Cartões de visita');
  });
});
