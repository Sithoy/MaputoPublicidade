import { afterEach, describe, expect, it } from 'vitest';
import { clearReceptionEdits, forgetReceptionEdit, receptionEditHeaders, registerReceptionEdit } from './reception-edit-session';

afterEach(clearReceptionEdits);
describe('Reception edit tokens', () => {
  it('fences only matching same-origin mutations, including delivery aliases', () => {
    registerReceptionEdit('MP-0001-2026', 'session-one', 'ORD-0001');
    expect(receptionEditHeaders('/api/quotes/MP-0001-2026/', 'PATCH')).toEqual({ 'X-Reception-Edit-Token': 'session-one' });
    expect(receptionEditHeaders('/api/orders/ORD-0001/set-delivery/', 'POST')).toEqual({ 'X-Reception-Edit-Token': 'session-one' });
    expect(receptionEditHeaders('/api/quotes/MP-0001-2026/', 'GET')).toEqual({});
    expect(receptionEditHeaders('https://other.test/api/quotes/MP-0001-2026/', 'POST')).toEqual({});
    forgetReceptionEdit('session-one');
    expect(receptionEditHeaders('/api/orders/ORD-0001/set-delivery/', 'POST')).toEqual({});
  });
});
