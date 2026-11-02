// UI contract and responsive layout only; server permissions and lifecycle are
// covered by test_operations.py and test_production.py against an isolated DB.
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

for (const size of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`unified operations · ${size.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await page.addInitScript(value => localStorage.setItem('mp_access_token', value), randomUUID());
    await page.route('**/auth-api/**', route => route.fulfill({ json: { status: 200, data: { user: { id: 99, email: 'visual@example.test', is_staff: true, role: 'production', capabilities: ['production.view', 'quotes.artwork', 'orders.view', 'orders.manage_status', 'orders.manage_delivery'] } } } }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/notifications/unread_count')) return route.fulfill({ json: { count: 0 } });
      if (url.pathname.includes('/notifications/')) return route.fulfill({ json: { results: [] } });
      if (url.pathname.includes('/production/operations/')) return route.fulfill({ json: {
        count: 1, next: null, overview: { all: 1, preparation: 0, new: 1, draft: 0, revisions: 0, approval: 0, followup: 0, ready: 0, production: 0, delivery: 0 },
        results: [{ reference: 'MP-0001-2026', client_name: 'Empresa Exemplo', description: '200 polos para campanha', task: 'new', followup: false, scheduled_date: null, needs_art: true, missing: [] }],
      } });
      return route.fulfill({ json: { reference: 'MP-0001-2026', client_name: 'Empresa Exemplo', order_reference: 'ORD-0001', status: 'approved', scheduled_date: null, production_notes: '', briefing: { description: 'Aplicar logótipo no peito' }, references: [], versions: [], operation: { stage: 'studio', label: 'Preparar arte', needs_art: true, art_ready: false, can_start: false, missing: [] }, artwork_routes: [{ item_id: 1, requirement: 'studio' }], items: [{ id: 1, description: 'Polo', quantity: 200, size: 'M / L', material: 'Algodão', colors: 'Verde', needs_design: true }] } });
    });
    await page.goto('/admin/operacoes');
    await expect(page.getByRole('heading', { name: 'Vamos dar vida ao próximo trabalho.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Faturas', exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`operations-${size.name}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Abrir trabalho MP-0001-2026' }).click();
    await expect(page.getByLabel('Mensagem sobre a arte')).toBeVisible();
    await page.getByRole('button', { name: /Produzir e conferir/ }).click();
    await expect(page.getByRole('button', { name: 'Iniciar produção' })).toBeDisabled();
    await expect(page.getByText('Aplicar logótipo no peito')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`operations-job-${size.name}.png`), fullPage: true });
  });
}
