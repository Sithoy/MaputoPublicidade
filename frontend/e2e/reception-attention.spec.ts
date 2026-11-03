// Synthetic browser contract; real expiry, lease, RBAC and audit tests run in
// test_reception_deadlines.py against an isolated database.
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

for (const size of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`Reception attention resolution · ${size.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await page.addInitScript(value => localStorage.setItem('mp_access_token', value), randomUUID());
    const issue = { code: 'proposal_expired', kind: 'expired', label: 'Proposta expirada — rever antes de voltar a enviar', due: '2026-10-01' };
    const quote = { id: 1, reference: 'MP-0001-2026', client_name: 'Empresa Horizonte', client_email: 'compras@example.test', status: 'quoted', items: [{ id: 1, description: '200 polos', quantity: 200 }], validity_days: 15, valid_until: '2026-10-01', final_price: 100,
      proposal_workflow: { stage: 'sent', version: 1 }, journey: { key: 'client', index: 2, label: 'Decisão do cliente', team: 'Cliente', blocker: 'Decisão da proposta', next_action: 'Rever proposta', steps: [] },
      workdesk: { issues: [issue], risk_window_hours: 48, stage_label: 'Com o cliente', next_action: 'Rever proposta expirada', follow_up_date: null }, activity: [], proof_versions: [] };
    let resolved = false;
    let attempts = 0;
    const mutations: string[] = [];
    await page.route('**/auth-api/**', route => route.fulfill({ json: { status: 200, data: { user: { id: 99, email: 'reception@example.test', is_staff: true, role: 'receptionist', capabilities: ['orders.view', 'quotes.view', 'quotes.manage', 'reception.manage'] } } } }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST') mutations.push(url.pathname);
      if (url.pathname.includes('/notifications/unread_count')) return route.fulfill({ json: { count: 0 } });
      if (url.pathname.includes('/notifications/')) return route.fulfill({ json: { results: [] } });
      if (url.pathname.includes('/edit-session/')) return route.fulfill({ json: route.request().method() === 'POST' ? { token: randomUUID(), session: { editor_id: 99, editor_name: 'Recepção', expires_at: new Date(Date.now() + 300000).toISOString() } } : { session: null } });
      if (url.pathname.includes('/resolve-attention/')) {
        attempts += 1;
        if (attempts === 1) return route.fulfill({ status: 409, json: { detail: 'A ligação falhou. Tente novamente.' } });
        resolved = true;
        return route.fulfill({ json: { detail: 'Resolução registada.', issues: [] } });
      }
      if (url.pathname.includes('/reception/hq/')) return route.fulfill({ json: { counts: { expired: resolved ? 0 : 1 }, updated_at: '2026-11-02T10:00:00Z' } });
      if (url.pathname.includes('/client-workspace/')) return route.fulfill({ json: { version: 1, published: true, expired: true, state: 'expired', channels: {}, history: [], decision: null } });
      if (url.pathname === '/api/quotes/') return route.fulfill({ json: { results: [quote], count: 1, next: null } });
      return route.fulfill({ json: resolved ? { ...quote, status: 'reviewing', proposal_workflow: { stage: 'draft', version: 1 }, journey: { ...quote.journey, key: 'proposal', index: 1 }, workdesk: { ...quote.workdesk, issues: [] } } : quote });
    });
    await page.goto('/admin/recepcao?pedido=MP-0001-2026');
    await page.getByRole('button', { name: 'Resolver pendências', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Resolver pendências' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Registar resolução' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Reservar atendimento' }).click();
    await expect(dialog.getByRole('button', { name: 'Registar resolução' })).toBeEnabled();
    await dialog.getByLabel('Resultado / motivo').fill('Rever condições e confirmar disponibilidade com o cliente');
    await dialog.getByRole('button', { name: 'Registar resolução' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Tente novamente');
    await expect(dialog.getByLabel('Resultado / motivo')).toHaveValue('Rever condições e confirmar disponibilidade com o cliente');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`reception-attention-${size.name}.png`), fullPage: true });
    await dialog.getByRole('button', { name: 'Registar resolução' }).click();
    await expect(dialog).not.toBeVisible();
    expect(mutations.filter(path => path.includes('/resolve-attention/'))).toHaveLength(2);
    expect(mutations.some(path => /email|whatsapp|approve|set-delivery/.test(path))).toBe(false);
  });
}
