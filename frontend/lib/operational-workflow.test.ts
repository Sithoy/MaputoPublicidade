import { describe, expect, it } from 'vitest';
import type { AdminQuote } from './admin-api';
import { receptionStage, productionStage } from './operational-workflow';

describe('Operational stages', () => {
  it('does not interpret internal approval as client acceptance', () => {
    const quote = { status: 'reviewing', proposal_workflow: { stage: 'approved' } } as AdminQuote;
    expect(receptionStage(quote).index).toBe(3);
    expect(receptionStage({ ...quote, proposal_workflow: { ...quote.proposal_workflow!, stage: 'review' } }).waiting).toBe(true);
    expect(receptionStage({ ...quote, order_reference: 'ORD-0001' }).index).toBe(4);
  });
  it('keeps returned proposals actionable and sent proposals in waiting', () => {
    expect(receptionStage({ proposal_workflow: { stage: 'returned' } } as AdminQuote).index).toBe(1);
    expect(receptionStage({ proposal_workflow: { stage: 'sent' } } as AdminQuote).waiting).toBe(true);
  });
  it('skips artwork when it is unnecessary, not when it is pending', () => {
    expect(productionStage('approved', false).key).toBe('production');
    expect(productionStage('approved', true, { published_at: '2026-10-12', client_decision: 'pending' })).toMatchObject({ key: 'art', waiting: true });
    expect(productionStage('approved', true, { published_at: null, client_decision: 'pending' }).waiting).toBe(false);
  });
  it('distinguishes execution from delivery', () => {
    expect(productionStage('in_production', false).key).toBe('production');
    expect(productionStage('ready', false).key).toBe('delivery');
    expect(productionStage('delivered', false).next).toContain('entregue');
  });
});
