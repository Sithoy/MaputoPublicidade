import { describe, expect, it } from 'vitest';
import type { User } from './api';
import {
  getDefaultAdminPath,
  getRequiredCapability,
  getRoleLabel,
  hasCapability,
} from './rbac';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'staff@example.com',
    is_staff: true,
    role: 'commercial',
    role_display: 'Comercial',
    capabilities: ['dashboard.view', 'quotes.view', 'quotes.manage'],
    ...overrides,
  };
}

describe('staff RBAC helpers', () => {
  it('uses capabilities returned by the backend', () => {
    const commercial = user();
    expect(hasCapability(commercial, 'quotes.manage')).toBe(true);
    expect(hasCapability(commercial, 'payments.manage')).toBe(false);
  });

  it('always grants capabilities to the owner', () => {
    expect(hasCapability(user({ is_superuser: true, capabilities: [] }), 'staff.manage')).toBe(true);
  });

  it('never grants staff capabilities to a client', () => {
    expect(hasCapability(user({ is_staff: false }), 'dashboard.view')).toBe(false);
  });

  it('selects a useful landing page for specialised roles', () => {
    expect(
      getDefaultAdminPath(user({ role: 'production', capabilities: ['orders.view'] }))
    ).toBe('/admin/encomendas');
    expect(
      getDefaultAdminPath(user({ role: 'content', capabilities: ['catalog.manage'] }))
    ).toBe('/admin/produtos');
    expect(
      getDefaultAdminPath(user({ role: 'finance', capabilities: ['invoices.view'] }))
    ).toBe('/admin/faturas');
    expect(
      getDefaultAdminPath(
        user({ role: 'receptionist', capabilities: ['intake.create', 'quotes.view', 'orders.view'] })
      )
    ).toBe('/admin/atendimento/novo');
  });

  it('maps protected routes and displays the assigned role', () => {
    expect(getRequiredCapability('/admin/parceiros/novo')).toBe('content.manage');
    expect(getRequiredCapability('/admin/utilizadores/12')).toBe('users.manage');
    expect(getRequiredCapability('/admin/faturas/FT-2026-0001')).toBe('invoices.view');
    expect(getRequiredCapability('/admin/atendimento/novo')).toBe('intake.create');
    expect(getRoleLabel(user())).toBe('Comercial');
  });
});
