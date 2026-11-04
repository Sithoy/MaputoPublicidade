import type { AdminQuote } from './admin-api';
import type { ActivityEvent, Order } from './api';

export type StageEvent = { action: string; actor?: string | null; at?: string | null; comment?: string; version?: number };
export type StageRecord = { outcome: string; facts: [string, string | null | undefined][]; events: StageEvent[] };
const activity = (rows: ActivityEvent[], actions: string[], status?: string): StageEvent[] => rows
  .filter((row) => actions.includes(row.action) && (!status || row.to_status === status))
  .map((row) => ({ action: row.action_display || row.action, actor: row.actor_name, at: row.created_at, comment: row.comment }));
const latest = <T extends { at?: string | null }>(rows: T[]) => rows.toSorted((a, b) => (b.at || '').localeCompare(a.at || ''))[0];
const channels: Record<string, string> = { phone: 'Telefone', email: 'Email', whatsapp: 'WhatsApp', branddesk: 'BrandDesk', link: 'Link privado', manual: 'Registo manual' };

export function stageRecord(quote: AdminQuote, step: number, order?: Order | null): StageRecord {
  const log = quote.activity || [];
  const history = quote.proposal_workflow?.history || [];
  if (step === 0) {
    const events = activity(log, ['reception_handoff']);
    const end = latest(events);
    return { outcome: 'Briefing encaminhado para proposta', facts: [
      ['Encaminhado por', end?.actor], ['Concluído em', end?.at || quote.reception?.completed_at],
    ], events };
  }
  if (step === 1) {
    const events = history.filter((row) => !row.client_decision && !row.channel);
    const saved = latest(events.filter((row) => row.action === 'Proposta guardada' || row.action === 'Disponibilizada ao cliente / envio registado'));
    return { outcome: 'Condições comerciais preparadas', facts: [
      ['Versão registada', saved ? `v${saved.version}` : undefined], ['Guardada / disponibilizada por', saved?.actor], ['Registado em', saved?.at],
    ], events };
  }
  if (step === 2) {
    const events = history.filter((row) => Boolean(row.client_decision || row.channel));
    const decision = latest(history.filter((row) => Boolean(row.client_decision) && row.version === quote.proposal_workflow?.version));
    const outcomes = { accept: 'Proposta aceite pelo cliente', changes: 'Cliente pediu alterações', decline: 'Proposta recusada pelo cliente' };
    return { outcome: decision?.client_decision ? outcomes[decision.client_decision] : quote.price_approved_at ? outcomes.accept : 'Decisão registada', facts: [
      ['Contacto que decidiu', decision?.contact_name], ['Registado por', decision?.actor || quote.price_approved_by_name],
      ['Decisão em', decision?.at || quote.price_approved_at], ['Canal', decision?.channel ? channels[decision.channel] || decision.channel : undefined],
      ['Comentário do cliente', decision?.comment || quote.price_approval_comment || 'Sem comentários registados'],
      ['Ordem operacional', quote.order_reference],
    ], events };
  }
  if (step === 3 || step === 4) {
    const proof = quote.proof_versions?.filter((row) => row.published_at).toSorted((a, b) => b.version - a.version)[0];
    const events = activity(log, step === 3 ? ['artwork_proof_uploaded'] : ['artwork_approved', 'artwork_changes_requested']);
    const end = latest(activity(log, step === 3 ? ['artwork_proof_uploaded'] : ['artwork_approved']));
    return { outcome: step === 3 ? 'Arte preparada para apreciação' : 'Arte aprovada para produção', facts: step === 3 ? [
      ['Versão publicada', proof ? `v${proof.version}` : undefined], ['Ficheiro submetido por', proof?.uploaded_by_name], ['Publicado em', proof?.published_at],
      ['Nota da equipa', proof?.designer_comment],
    ] : [
      ['Versão aprovada', proof?.client_decision === 'approved' ? `v${proof.version}` : undefined],
      ['Aprovação registada por', end?.actor], ['Aprovação em', end?.at || quote.artwork?.approved_at], ['Comentário do cliente', proof?.client_comment],
    ], events };
  }
  const events = activity(order?.activity || [], ['status_changed', 'delivery_confirmed'], step === 5 ? 'ready' : 'delivered');
  const end = latest(events);
  return { outcome: step === 5 ? 'Produção concluída; trabalho pronto' : 'Entrega / levantamento registado', facts: [
    [step === 5 ? 'Conclusão registada por' : 'Entrega registada por', end?.actor], ['Registado em', end?.at],
    ['Ordem operacional', quote.order_reference],
    ...(step >= 6 ? [['Receção do trabalho', order?.delivery_method_display || (order?.delivery_method === 'delivery' ? 'Entrega' : order?.delivery_method === 'pickup' ? 'Levantamento' : undefined)],
      ['Local registado', order?.delivery_address], ['Confirmação do cliente em', order?.client_confirmed_at]] as StageRecord['facts'] : []),
  ], events };
}
