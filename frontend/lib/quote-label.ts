import type { Quote } from './api';

export function quoteLabel(quote: Quote) {
  const items = quote.items ?? [];
  if (items.length === 1) return items[0].description;
  if (items.length > 1) return `${items[0].description} +${items.length - 1}`;
  if (quote.item_count === 1) return '1 item solicitado';
  if (quote.item_count && quote.item_count > 1) return `${quote.item_count} itens solicitados`;
  return 'Orçamento';
}
