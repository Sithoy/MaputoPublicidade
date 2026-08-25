import { describe, expect, it } from 'vitest';
import { getClientNextAction, getOrderProgress, getOrderStageIndex } from './workflow';

describe('portal workflow helpers', () => {
  it('maps operational statuses to the client journey', () => {
    expect(getOrderStageIndex('received')).toBe(0);
    expect(getOrderStageIndex('quoted')).toBe(2);
    expect(getOrderStageIndex('in_production')).toBe(4);
    expect(getOrderStageIndex('delivered')).toBe(5);
  });

  it('gives completed orders full progress', () => {
    expect(getOrderProgress('delivered')).toBe(100);
    expect(getOrderProgress('cancelled')).toBe(0);
  });

  it('prioritises client approval when a proposal is ready', () => {
    const action = getClientNextAction({
      status: 'quoted',
      payment_status: 'pending',
      amount_due: 2500,
      artwork: null,
    });

    expect(action.actionRequired).toBe(true);
    expect(action.label).toBe('Aprovar a proposta');
  });

  it('explains when production is moving without client action', () => {
    const action = getClientNextAction({
      status: 'in_production',
      payment_status: 'paid',
      amount_due: 0,
      artwork: null,
    });

    expect(action.actionRequired).toBe(false);
    expect(action.tone).toBe('progress');
  });
});

