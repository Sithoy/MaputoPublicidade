import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { MonitoringDashboard, type MonitoringData } from './MonitoringDashboard';

let allowed = true;
let params = new URLSearchParams();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useSearchParams: () => params, useRouter: () => ({ replace }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: (capability: string) => allowed && capability === 'observability.view' }) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));

const report: MonitoringData = {
  generated_at: '2026-10-31T10:30:00Z', hours: 24, category: 'health', start: '2026-10-30T10:30:00Z', enabled: true,
  first_observed_at: null, last_observed_at: null,
  summary: { requests: 0, server_errors: 0, denied: 0, rate_limited: 0, slow: 0, average_ms: null, max_ms: 0, server_error_rate: null },
  events: [], breakdown: [], alerts: [], rules: [{ code: 'server_error', label: 'Falha no backend', threshold: 5, window_minutes: 5, dedupe_minutes: 30 }],
  page: 1, page_size: 20, total_groups: 0,
  business: { requests_created: 8, orders_created: 3, proposals_accepted: 4 },
  coverage: { backend: true, database: 'reachable', frontend_edge: false, external_alerts_verified: false, sentry_configured: false, uptime_monitor_verified: false, retention: { buckets_days: 30, events_days: 14, alerts_days: 30, cleanup: 'daily on activity' } },
};
beforeEach(() => { allowed = true; params = new URLSearchParams(); vi.clearAllMocks(); vi.mocked(fetchWithAuth).mockImplementation(async (path) => ({ ...report, category: new URL(path, 'http://localhost').searchParams.get('category') || 'health' })); });
afterEach(() => vi.restoreAllMocks());

it('does not fetch or expose monitoring to an unauthorized role', () => {
  allowed = false;
  render(<MonitoringDashboard />);
  expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso');
  expect(fetchWithAuth).not.toHaveBeenCalled();
});

it('shows empty evidence without inventing latency or uptime', async () => {
  render(<MonitoringDashboard />);
  expect(await screen.findByText('A recolha ainda não tem pedidos observados')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tempo médio' }).closest('article')).toHaveTextContent('—');
  expect(screen.getByText(/não apresentamos disponibilidade ou latência inventadas/)).toBeInTheDocument();
  expect(fetchWithAuth).toHaveBeenCalledWith('/api/observability/report/?hours=24&category=health&page=1', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it('uses bounded URL-backed filters and links for navigation', async () => {
  params = new URLSearchParams('view=seguranca&hours=1&page=2');
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...report, hours: 1, category: 'security', page: 2, total_groups: 22 });
  render(<MonitoringDashboard />);
  await screen.findByText('22 grupos · página 2');
  expect(fetchWithAuth).toHaveBeenCalledWith('/api/observability/report/?hours=1&category=security&page=2', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', '/admin/monitorizacao?view=seguranca&hours=1&page=1');
  fireEvent.change(screen.getByLabelText('Período de monitorização'), { target: { value: '168' } });
  expect(replace).toHaveBeenCalledWith('/admin/monitorizacao?view=seguranca&hours=168&page=1');
});

it('falls back safely from invalid URL parameters', async () => {
  params = new URLSearchParams('view=unknown&hours=999&page=-3');
  render(<MonitoringDashboard />);
  await screen.findByText('A recolha ainda não tem pedidos observados');
  expect(fetchWithAuth).toHaveBeenCalledWith('/api/observability/report/?hours=24&category=health&page=1', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it('keeps the last successful snapshot visible when refreshing fails', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...report, summary: { ...report.summary, requests: 42 } });
  render(<MonitoringDashboard />);
  await screen.findByText('42');
  vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('último retrato disponível foi mantido');
  expect(screen.getByText('42')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(3));
});

it('renders diagnostic codes and request IDs separately from visitor analytics', async () => {
  params = new URLSearchParams('view=seguranca');
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...report, category: 'security', events: [{ code: 'link_expired', label: 'Link expirado', route: 'public-art-review', method: 'GET', status: 410, count: 3, request_id: '00000000-0000-4000-8000-000000000001', last_seen: report.generated_at }], total_groups: 1 });
  render(<MonitoringDashboard />);
  await screen.findByRole('heading', { name: 'Link expirado' });
  fireEvent.click(screen.getByText('Referência técnica'));
  expect(screen.getByText('link_expired')).toBeInTheDocument();
  expect(screen.getByText('00000000-0000-4000-8000-000000000001')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Tráfego do website/ })).toHaveAttribute('href', '/admin/trafego');
});

it('uses actual backend business records rather than click counts', async () => {
  params = new URLSearchParams('view=operacao');
  render(<MonitoringDashboard />);
  await screen.findByText('Resultados reais, não estimativas de navegação');
  expect(screen.getByRole('heading', { name: 'Pedidos registados' }).closest('article')).toHaveTextContent('8');
  expect(screen.getByRole('heading', { name: 'Propostas aceites' }).closest('article')).toHaveTextContent('4');
});

it('does not describe a configured integration as verified or complete coverage', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...report, coverage: { ...report.coverage, sentry_configured: true } });
  render(<MonitoringDashboard />);
  await screen.findByText('A recolha ainda não tem pedidos observados');
  fireEvent.click(screen.getByText('Cobertura, alertas e limites'));
  expect(screen.getByText(/entrega e alertas externos ainda não verificados/)).toBeInTheDocument();
  expect(screen.getByText(/Vercel, bloqueios antes de chegar ao backend/)).toBeInTheDocument();
});

it('shows an explicit disabled state', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...report, enabled: false });
  render(<MonitoringDashboard />);
  expect(await screen.findByText('Recolha operacional desativada neste ambiente')).toBeInTheDocument();
});

it('only schedules automatic refresh when requested and cleans up the timer', async () => {
  const schedule = vi.spyOn(window, 'setInterval');
  const clear = vi.spyOn(window, 'clearInterval');
  const { unmount } = render(<MonitoringDashboard />);
  await screen.findByText('A recolha ainda não tem pedidos observados');
  expect(schedule).not.toHaveBeenCalledWith(expect.any(Function), 60000);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Atualizar a cada 60 s' }));
  expect(schedule).toHaveBeenCalledWith(expect.any(Function), 60000);
  const index = schedule.mock.calls.findIndex(([, delay]) => delay === 60000);
  unmount();
  expect(clear).toHaveBeenCalledWith(schedule.mock.results[index].value);
});
