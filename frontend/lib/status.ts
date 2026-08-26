// Canonical order/quote status labels shared by the admin and client areas.
// Keep wording consistent everywhere; add client-specific phrasing in
// clientOrderStatusLabels instead of copying these maps into pages.

export const orderStatusLabels: Record<string, string> = {
  received: 'Pedido recebido',
  reviewing: 'Em análise',
  quoted: 'Orçamentado',
  approved: 'Aprovado',
  in_production: 'Em produção',
  ready: 'Pronto para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// Client-facing wording: same statuses, phrased around what the client
// needs to know or do next.
export const clientOrderStatusLabels: Record<string, string> = {
  ...orderStatusLabels,
  quoted: 'Aguardando aprovação',
};

export const orderStatusOptions = [
  { value: '', label: 'Todos os estados' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label })),
];
