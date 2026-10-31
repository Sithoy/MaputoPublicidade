import { describe, expect, it } from 'vitest';
import { orderWorkspaceHref, requestWorkspaceHref } from './admin-workspaces';
import type { StaffCapability } from './rbac';

const owner = () => true;
const reception = (value: StaffCapability) => ['reception.manage', 'orders.view', 'quotes.view'].includes(value);
const order = { reference: 'ORD-0001', quote_reference: 'MP-0001-2026', status: 'approved' as const, artwork_status: 'pending' };
describe('Canonical workspaces', () => {
  it('keeps requests in Reception and leaves consult-only users on the record', () => {
    expect(requestWorkspaceHref(order.quote_reference, reception)).toBe('/admin/recepcao?pedido=MP-0001-2026');
    expect(requestWorkspaceHref(order.quote_reference, () => false)).toBe('/admin/orcamentos/MP-0001-2026');
  });
  it('opens the same order in the responsible workspace', () => {
    expect(orderWorkspaceHref(order, owner)).toBe('/admin/studio?pedido=MP-0001-2026');
    expect(orderWorkspaceHref({ ...order, status: 'in_production' }, owner)).toBe('/admin/producao?pedido=MP-0001-2026');
    expect(orderWorkspaceHref({ ...order, status: 'ready' }, owner)).toBe('/admin/entregas?encomenda=ORD-0001');
    expect(orderWorkspaceHref(order, reception)).toBe('/admin/recepcao?pedido=MP-0001-2026');
    expect(orderWorkspaceHref(order, () => false)).toBe('/admin/encomendas/ORD-0001');
  });
});
