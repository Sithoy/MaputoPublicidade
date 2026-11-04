import { describe, expect, it } from 'vitest';
import type { AdminQuote } from './admin-api';
import type { Order } from './api';
import { stageRecord } from './stage-record';

const quote = { reference: 'MP-0001-2026', items: [], reception: { completed_at: '2026-11-01T10:00:00Z', owner_name: 'Responsável atual' }, activity: [] } as unknown as AdminQuote;
describe('completed stage records', () => {
  it('uses the recorded handoff, never the current owner or a generic briefing edit', () => {
    const result = stageRecord({ ...quote, activity: [
      { id: 1, action: 'reception_handoff', actor_name: 'Ana', created_at: '2026-11-01T10:00:00Z' },
      { id: 2, action: 'reception_updated', actor_name: 'Outro editor', created_at: '2026-11-02T10:00:00Z' },
    ] }, 0);
    expect(result.facts).toContainEqual(['Encaminhado por', 'Ana']);
    expect(result.events).toHaveLength(1);
    expect(stageRecord(quote, 0).facts[0][1]).toBeUndefined();
  });
  it('separates the client contact from the staff member who records the decision', () => {
    const result = stageRecord({ ...quote, proposal_workflow: { version: 2, history: [
      { action: 'Proposta aceite', version: 1, client_decision: 'accept', contact_name: 'Antigo', actor: 'Antigo editor', at: '2026-10-01', comment: '' },
      { action: 'Proposta aceite', version: 2, client_decision: 'accept', contact_name: 'Cliente Ana', actor: 'Rececionista João', channel: 'phone', at: '2026-11-01', comment: 'Aceite por telefone' },
    ] } as AdminQuote['proposal_workflow'] }, 2);
    expect(result.facts).toContainEqual(['Contacto que decidiu', 'Cliente Ana']);
    expect(result.facts).toContainEqual(['Registado por', 'Rececionista João']);
    expect(result.events).toHaveLength(2);
  });
  it('keeps previous proposal versions and excludes client decisions from preparation history', () => {
    const result = stageRecord({ ...quote, proposal_workflow: { history: [
      { action: 'Proposta guardada', version: 1, at: '2026-10-01', actor: 'Ana', comment: '' },
      { action: 'Proposta guardada', version: 2, at: '2026-11-01', actor: 'João', comment: '' },
      { action: 'Proposta aceite', version: 2, client_decision: 'accept', at: '2026-11-02', actor: 'Cliente', comment: '' },
    ] } as AdminQuote['proposal_workflow'] }, 1);
    expect(result.facts).toContainEqual(['Guardada / disponibilizada por', 'João']);
    expect(result.events.map((event) => event.version)).toEqual([1, 2]);
  });
  it('does not mistake art upload time or uploader for approval', () => {
    const result = stageRecord({ ...quote, proof_versions: [{ id: 1, version: 1, file: '', created_at: '2026-11-01', published_at: '2026-11-02', uploaded_by_name: 'Designer', client_decision: 'approved' }] }, 4);
    expect(result.facts).toContainEqual(['Aprovação registada por', undefined]);
    expect(result.facts).toContainEqual(['Aprovação em', undefined]);
  });
  it('uses only operational completion events and never includes financial logs', () => {
    const order = { activity: [
      { id: 1, action: 'status_changed', to_status: 'ready', actor_name: 'Produção', created_at: '2026-11-01' },
      { id: 2, action: 'payment_recorded', actor_name: 'Finanças', comment: 'Informação financeira', created_at: '2026-11-02' },
      { id: 3, action: 'status_changed', to_status: 'delivered', actor_name: 'Entrega', created_at: '2026-11-03' },
    ] } as Order;
    expect(stageRecord(quote, 5, order).facts).toContainEqual(['Conclusão registada por', 'Produção']);
    expect(stageRecord(quote, 6, order).facts).toContainEqual(['Entrega registada por', 'Entrega']);
    expect(JSON.stringify(stageRecord(quote, 7, order))).not.toContain('Informação financeira');
  });
});
