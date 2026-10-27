import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { TrafficDashboard, type TrafficData } from './TrafficDashboard';

let allowed = true;
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => allowed }) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const report: TrafficData = {
  days: 30, timezone: 'Africa/Maputo', generated_at: '2026-10-26T12:00:00Z', start: '2026-09-27', end: '2026-10-26', first_event_at: null,
  summary: { visitors: 0, sessions: 0, page_views: 0, whatsapp_clicks: 0, requests: 0, registrations: 0, request_session_rate: null }, previous: null,
  daily: [{ date: '2026-10-26', views: 0 }], pages: [], sources: [], devices: [], actions: [],
};
beforeEach(() => { allowed = true; vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue(report); });

describe('website traffic workspace', () => {
  it('shows a truthful empty state and no invented conversion rate', async () => {
    render(<TrafficDashboard />);
    expect(await screen.findByText('À espera das primeiras visitas')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/Não reconstruímos tráfego histórico/)).toBeInTheDocument();
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/website-traffic/report/?days=30');
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '7' } });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/website-traffic/report/?days=7'));
  });
  it('does not fetch reports for an unauthorised role', () => {
    allowed = false; render(<TrafficDashboard />);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso'); expect(fetchWithAuth).not.toHaveBeenCalled();
  });
  it('supports recovery after an API error', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(Error('offline'));
    render(<TrafficDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(await screen.findByText('À espera das primeiras visitas')).toBeInTheDocument();
  });
  it('renders returned traffic, origins and completed submissions separately from clicks', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ ...report, first_event_at: report.generated_at,
      summary: { ...report.summary, visitors: 12, sessions: 15, page_views: 30, requests: 2, request_session_rate: 13.3 },
      pages: [{ path: '/catalogo', views: 20, sessions: 10 }], sources: [{ source: 'google', views: 20, sessions: 10 }],
      actions: [{ kind: 'quote_submitted', count: 2 }, { kind: 'whatsapp_click', count: 5 }],
    });
    render(<TrafficDashboard />);
    expect(await screen.findByText('13.3%')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument(); expect(screen.getByText('Catálogo')).toBeInTheDocument();
    expect(screen.queryByText('À espera das primeiras visitas')).not.toBeInTheDocument();
  });
});
