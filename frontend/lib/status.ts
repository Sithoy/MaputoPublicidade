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

// Mirror of the backend ALLOWED_TRANSITIONS maps (quotes/orders models) so the
// admin UI only offers transitions the API will accept.
export const quoteStatusTransitions: Record<string, string[]> = {
  received: ['reviewing', 'cancelled'],
  reviewing: ['received', 'quoted', 'cancelled'],
  quoted: ['reviewing', 'approved', 'cancelled'],
  approved: ['cancelled'],
  in_production: ['ready', 'cancelled'],
  ready: ['in_production', 'delivered', 'cancelled'],
  delivered: [],
  cancelled: ['received'],
};

export const orderStatusTransitions: Record<string, string[]> = {
  ...quoteStatusTransitions,
  approved: ['in_production', 'cancelled'],
  cancelled: ['approved'],
};

export function allowedNextStatuses(
  current: string,
  transitions: Record<string, string[]> = orderStatusTransitions
): string[] {
  return [current, ...(transitions[current] ?? [])];
}
