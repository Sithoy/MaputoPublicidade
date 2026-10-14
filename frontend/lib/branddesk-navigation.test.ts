import { describe, expect, it } from 'vitest';
import { brandDeskNavigation, countPendingDecisions, isBrandDeskRouteActive } from './branddesk-navigation';

describe('BrandDesk client journey', () => {
  it('puts daily work before company resources and history', () => {
    expect(brandDeskNavigation.map((item) => item.label)).toEqual(['Visão geral', 'Pedidos e propostas', 'Projetos e entregas', 'Aprovações', 'Mensagens', 'Faturas e pagamentos', 'Biblioteca da marca', 'Histórico de trabalhos', 'Perfil da empresa']);
    expect(new Set(brandDeskNavigation.map((item) => item.href)).size).toBe(9);
  });
  it('highlights only the relevant route including details', () => {
    expect(isBrandDeskRouteActive('/area-cliente/orcamentos/MP-0001', '/area-cliente/orcamentos')).toBe(true);
    expect(isBrandDeskRouteActive('/area-cliente/orcamentos', '/area-cliente')).toBe(false);
    expect(isBrandDeskRouteActive('/area-cliente/orcamentos-extra', '/area-cliente/orcamentos')).toBe(false);
  });
  it('counts commercial and artwork decisions independently without cancelled work', () => {
    expect(countPendingDecisions([{ status: 'quoted', artwork: { status: 'pending' } }, { status: 'quoted', price_approved_at: '2026-10-14', artwork: { status: 'approved' } }, { status: 'cancelled', artwork: { status: 'pending' } }])).toBe(2);
  });
});
