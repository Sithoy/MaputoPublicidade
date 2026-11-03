// Synthetic browser contract; real-model aggregation and RBAC live in test_management_overview.py.
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

for (const size of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`manager overview · ${size.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await page.addInitScript(value => localStorage.setItem('mp_access_token', value), randomUUID());
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const jobs = ['briefing', 'client', 'art_client', 'production', 'delivery'].map((key, i) => ({
      reference: `MP-000${i + 1}-2026`, quote_reference: `MP-000${i + 1}-2026`, order_reference: i > 1 ? `ENC-${i}` : null,
      client_name: ['Empresa Horizonte', 'Safari Exemplo', 'Campanha Verde', 'Marca Exemplo', 'Escritório Exemplo'][i], summary: ['200 polos', 'Placas de identificação', 'Cadernos personalizados', 'Sinalética', 'Identificação do escritório'][i],
      journey: { key, label: ['Briefing', 'Decisão do cliente', 'Aprovação da arte', 'Produção', 'Pronto para entrega'][i], team: i === 1 || i === 2 ? 'Cliente' : 'Recepção', next_action: i === 3 ? 'Confirmar detalhes técnicos' : 'Acompanhar trabalho', blocker: i === 3 ? 'Informação técnica por confirmar' : '' },
      issues: i === 0 ? [{ code: 'followup_overdue', kind: 'overdue', label: 'Seguimento em atraso', due: '2026-11-02' }] : [],
      attention: i === 0 ? 'overdue' : i === 3 ? 'blocked' : null, updated_at: '2026-11-02T10:00:00Z', days_since_update: i + 1,
      scheduled_date: i === 4 ? '2026-11-04T10:00:00+02:00' : null, delivery_method: 'pickup',
    }));
    await page.route('**/auth-api/**', route => route.fulfill({ json: { status: 200, data: { user: { id: 99, email: 'manager@example.test', is_staff: true, role: 'administrator', capabilities: ['dashboard.view', 'orders.view', 'quotes.view', 'reception.manage'] } } } }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/management/overview/')) return route.fulfill({ json: {
        generated_at: '2026-11-03T10:00:00Z', risk_window_hours: 48, delivery_days: Number(url.searchParams.get('days') || 7), delivery_end_exclusive: '2026-11-10',
        counts: { active: 5, attention: 2, overdue: 1, blocked: 1, risk: 0, deliveries: 1, unscheduled: 2 },
        columns: ['requests', 'proposals', 'art', 'production', 'ready'].map((key, i) => ({ key, count: 1, attention_count: i === 0 || i === 3 ? 1 : 0, waiting_client: i === 1 || i === 2 ? 1 : 0, oldest_update: jobs[i] })),
        exceptions: [jobs[0], jobs[3]], deliveries: [jobs[4]],
      } });
      if (url.pathname.includes('/notifications/unread_count')) return route.fulfill({ json: { count: 0 } });
      return route.fulfill({ json: { results: [] } });
    });
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Precisa de intervenção' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('link', { name: /MP-0001-2026 · Empresa Horizonte/ })).toHaveAttribute('href', '/admin/recepcao?pedido=MP-0001-2026');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Horizonte de entregas').selectOption('14');
    await expect(page.getByLabel('Horizonte de entregas')).toHaveValue('14');
    await expect(page.getByText('Entregas / levantamentos · 14 dias')).toBeVisible();
    await page.getByText('Fontes e critérios', { exact: true }).click();
    await expect(page.getByText(/não calcula receita/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`management-${size.name}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
