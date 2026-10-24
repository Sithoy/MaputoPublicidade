import type { AdminQuote } from './admin-api';

export const receptionSteps = ['Atendimento e briefing', 'Preparar proposta', 'Decisão do cliente', 'Produção e entrega'];
export function receptionStage(quote: AdminQuote & { reception_completed_at?: string | null; operational_order_status?: string | null }) {
  if (quote.operational_order_status === 'delivered') return { index: 3, waiting: false, next: 'Trabalho entregue. Consulte o histórico e o registo da entrega.' };
  if (quote.order_reference || quote.price_approved_at) return { index: 3, waiting: false, next: 'Coordenar o trabalho e a entrega com a Produção.' };
  const stage = quote.proposal_workflow?.stage;
  if (stage === 'review' || stage === 'approved') return { index: 2, waiting: false, next: 'Enviar a proposta guardada ao cliente ou editar as condições.' };
  if (stage === 'sent' || (stage === 'legacy' && quote.status === 'quoted')) return { index: 2, waiting: true, next: 'Acompanhar a decisão do cliente no mesmo pedido.' };
  if (stage === 'returned') return { index: 1, waiting: false, next: 'Ajustar as condições e guardar ou enviar a proposta.' };
  if (quote.reception?.completed_at || quote.reception_completed_at || quote.proposal_workflow?.prepared_by_id) return { index: 1, waiting: false, next: 'Preparar artigos, valores, prazo e condições. Guardar ou enviar ao cliente.' };
  return { index: 0, waiting: false, next: 'Assumir o atendimento e confirmar apenas o briefing necessário.' };
}
export function productionStage(status: string, needsArt: boolean, version?: { published_at: string | null; client_decision: string }) {
  if (status === 'cancelled') return { key: 'brief', waiting: false, next: 'Trabalho cancelado. Consulte os detalhes; não iniciar a produção.' };
  if (status === 'delivered') return { key: 'delivery', waiting: false, next: 'Trabalho entregue. Consulte o registo de entrega.' };
  if (status === 'ready') return { key: 'delivery', waiting: false, next: 'Conferir o trabalho e coordenar o levantamento, entrega ou instalação.' };
  if (status === 'in_production') return { key: 'production', waiting: false, next: 'Executar e conferir o trabalho antes de o marcar pronto.' };
  if (needsArt && (!version || !version.published_at || version.client_decision === 'changes_requested')) return { key: 'art', waiting: false, next: 'Preparar ou ajustar a arte e submeter para apreciação.' };
  if (needsArt && version?.client_decision === 'pending') return { key: 'art', waiting: true, next: 'Aguardar a apreciação do cliente. Não iniciar com arte pendente.' };
  return { key: 'production', waiting: !['approved'].includes(status), next: status === 'approved' ? 'Confirmar o briefing técnico e iniciar a produção.' : 'Aguardar a ordem de produção; pode preparar o trabalho técnico.' };
}
