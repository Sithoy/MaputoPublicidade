// Synthetic UI/visual contract. Backend journey parity and RBAC are tested in
// test_job_workflow.py with real models in an isolated test database.
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

const steps = ['Briefing', 'Proposta', 'Decisão do cliente', 'Preparar arte', 'Aprovação da arte', 'Produção', 'Pronto para entrega', 'Entregue'].map((label, i) => ({ key: ['briefing', 'proposal', 'client', 'art', 'art_client', 'production', 'delivery', 'delivered'][i], label, skipped: false }));
const journey = { key: 'art_client', index: 4, label: 'Aprovação da arte', cancelled: false, needs_art: true, team: 'Cliente', blocker: 'Decisão do cliente sobre a arte', next_action: 'Rever e decidir a arte', steps };
const quote = { id: 1, reference: 'MP-0001-2026', client_name: 'Empresa Horizonte', client_email: 'compras@example.test', status: 'approved', operational_order_status: 'approved', order_reference: 'ORD-0001', price_approved_at: '2026-11-02T10:00:00Z', journey, proof_versions: [], items: [{ id: 1, description: '200 polos', quantity: 200 }], activity: [], workdesk: { stage_label: journey.label, next_action: 'Acompanhar decisão da arte', blocker: journey.blocker, follow_up_date: null }, proposal_workflow: { stage: 'sent', version: 1 } };

for (const size of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }, { name: 'landscape', width: 844, height: 390 }]) {
  test(`shared journey board and Reception · ${size.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await page.addInitScript(value => localStorage.setItem('mp_access_token', value), randomUUID());
    await page.route('**/auth-api/**', route => route.fulfill({ json: { status: 200, data: { user: { id: 99, email: 'reception@example.test', is_staff: true, role: 'receptionist', capabilities: ['orders.view', 'quotes.view', 'reception.manage'] } } } }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/notifications/unread_count')) return route.fulfill({ json: { count: 0 } });
      if (url.pathname.includes('/notifications/')) return route.fulfill({ json: { results: [] } });
      if (url.pathname.includes('/workflow/board/')) return route.fulfill({ json: { results: [
        { reference: 'MP-0002-2026', quote_reference: 'MP-0002-2026', client_name: 'Empresa Exemplo', summary: 'Identificação de escritório', journey: { ...journey, key: 'briefing', label: 'Briefing', index: 0, team: 'Recepção', blocker: '', next_action: 'Completar briefing' } },
        { reference: 'MP-0003-2026', quote_reference: 'MP-0003-2026', client_name: 'Campanha Exemplo', summary: '500 cadernos personalizados', journey: { ...journey, key: 'proposal', label: 'Proposta', index: 1, team: 'Recepção', blocker: '', next_action: 'Preparar e enviar proposta' } },
        { reference: quote.reference, quote_reference: quote.reference, order_reference: quote.order_reference, client_name: quote.client_name, summary: '200 polos', journey },
      ], counts: { briefing: 1, proposal: 1, art_client: 1 }, count: 3, page: 1, page_size: 80, generated_at: '2026-11-02T10:00:00Z' } });
      if (url.pathname.includes('/edit-session/')) return route.fulfill({ json: { session: null } });
      if (url.pathname.includes('/reception/hq/')) return route.fulfill({ json: { counts: {}, updated_at: '2026-11-02T10:00:00Z' } });
      if (url.pathname === '/api/quotes/') return route.fulfill({ json: { results: [quote], count: 1, next: null } });
      return route.fulfill({ json: quote });
    });
    await page.goto('/admin/quadro');
    await expect(page.getByRole('link', { name: /Empresa Horizonte/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`workflow-board-${size.name}.png`), fullPage: true });
    await expect(page.getByRole('region')).toHaveCount(5);
    await expect(page.getByText('Aguarda aprovação da arte', { exact: true })).toBeVisible();
    await page.getByLabel('Fase').selectOption('art');
    await expect(page).toHaveURL(/column=art/);
    await page.getByRole('link', { name: /Empresa Horizonte/ }).click();
    await expect(page.getByRole('button', { name: '5 Aprovação da arte' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('heading', { name: 'Artes partilhadas com o cliente' })).toBeVisible();
    await expect(page.getByRole('button', { name: '6 Produção' })).toBeEnabled();
    await page.getByRole('button', { name: '6 Produção' }).click();
    await expect(page.getByRole('heading', { name: 'Produção', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar produção' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`workflow-reception-${size.name}.png`), fullPage: true });
  });
}
