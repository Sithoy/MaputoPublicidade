// Browser contract/layout checks use mock data only. Server RBAC and telemetry
// persistence are covered separately by test_observability.py.
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`monitoring layout and navigation · ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    // This is an isolated browser context and a synthetic, non-authenticating token.
    await page.addInitScript(value => localStorage.setItem('mp_access_token', value), randomUUID());
    await page.route('**/auth-api/**', route => route.fulfill({ json: { status: 200, data: { user: { id: 99, email: 'visual-test@example.test', is_staff: true, is_superuser: false, role: 'administrator', capabilities: ['observability.view', 'traffic.view'] } } } }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/notifications/unread_count')) return route.fulfill({ json: { count: 0 } });
      if (url.pathname.includes('/notifications/')) return route.fulfill({ json: { results: [] } });
      if (!url.pathname.includes('/observability/report/')) return route.fulfill({ json: {} });
      const security = url.searchParams.get('category') === 'security';
      return route.fulfill({ json: {
        generated_at: '2026-10-31T10:30:00Z', start: '2026-10-30T10:30:00Z', hours: Number(url.searchParams.get('hours') || 24), category: url.searchParams.get('category'), enabled: true,
        first_observed_at: security ? '2026-10-31T10:30:00Z' : null, last_observed_at: security ? '2026-10-31T10:30:00Z' : null,
        summary: { requests: security ? 3 : 0, server_errors: 0, denied: 0, rate_limited: 0, slow: 0, average_ms: security ? 100 : null, max_ms: security ? 100 : 0, server_error_rate: security ? 0 : null },
        events: security ? [{ code: 'link_expired', label: 'Link expirado', route: 'public-art-review', method: 'GET', status: 410, count: 3, request_id: randomUUID(), last_seen: '2026-10-31T10:30:00Z' }] : [],
        breakdown: security ? [{ code: 'link_expired', count: 3 }] : [], alerts: [], rules: [], page: 1, page_size: 20, total_groups: security ? 1 : 0,
        business: { requests_created: 0, orders_created: 0, proposals_accepted: 0 },
        coverage: { backend: true, database: 'reachable', frontend_edge: false, external_alerts_verified: false, sentry_configured: false, uptime_monitor_verified: false, retention: { buckets_days: 30, events_days: 14, alerts_days: 30, cleanup: 'daily on activity' } },
      } });
    });
    await page.goto('/admin/monitorizacao');
    await expect(page.getByRole('heading', { name: 'Como está a funcionar a MP?' })).toBeVisible();
    await expect(page.getByText('A recolha ainda não tem pedidos observados')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`monitoring-${viewport.name}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Segurança', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Link expirado' })).toBeVisible();
    await page.getByText('Referência técnica').click();
    await expect(page.getByText('link_expired', { exact: true })).toBeVisible();
    await page.getByText('Cobertura, alertas e limites').click();
    await expect(page.getByText(/Vercel, bloqueios antes de chegar ao backend/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
