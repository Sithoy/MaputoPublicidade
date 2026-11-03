import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { ManagementOverview } from './ManagementOverview';
import type { ManagementJob, ManagementSnapshot } from '@/lib/management-overview';

let allowed = true;
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => allowed }) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const job = { reference: 'MP-0001-2026', quote_reference: 'MP-0001-2026', order_reference: 'ENC-2026-0001', client_name: 'Empresa Horizonte', summary: '200 polos', journey: { key: 'production', label: 'Produção', team: 'Produção', blocker: '', next_action: 'Conferir trabalho' }, issues: [{ code: 'delivery_overdue', kind: 'overdue', label: 'Compromisso ultrapassado', due: '2026-11-03T08:00:00+02:00' }], attention: 'overdue', scheduled_date: '2026-11-03T08:00:00+02:00', updated_at: '2026-11-02T10:00:00Z', days_since_update: 1, delivery_method: 'delivery' } as ManagementJob;
const snapshot: ManagementSnapshot = { generated_at: '2026-11-03T10:00:00Z', risk_window_hours: 48, delivery_days: 7, delivery_end_exclusive: '2026-11-10', counts: { active: 1, attention: 1, overdue: 1, blocked: 0, risk: 0, deliveries: 1, unscheduled: 0 }, columns: ['requests', 'proposals', 'art', 'production', 'ready'].map(key => ({ key, count: key === 'production' ? 1 : 0, attention_count: key === 'production' ? 1 : 0, waiting_client: 0, oldest_update: key === 'production' ? job : null })), exceptions: [job], deliveries: [job] };
beforeEach(() => { allowed = true; vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue(snapshot); });

it('renders source-backed management priorities with actionable jobs and honest ageing', async () => {
  render(<ManagementOverview />);
  expect(await screen.findByRole('heading', { name: 'Precisa de intervenção' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /MP-0001-2026 · Empresa Horizonte/ })).toHaveAttribute('href', '/admin/recepcao?pedido=MP-0001-2026');
  expect(screen.getByRole('link', { name: 'Produção 1' })).toHaveAttribute('href', '/admin/quadro?column=production');
  expect(screen.getByText(/não ao tempo passado na fase/)).toBeInTheDocument();
  expect(screen.queryByText('Receita')).not.toBeInTheDocument();
});

it('retains stale-data warning on failed refresh and does not reuse a wrong delivery window', async () => {
  render(<ManagementOverview />);
  await screen.findByRole('heading', { name: 'Precisa de intervenção' });
  vi.mocked(fetchWithAuth).mockRejectedValue(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('heading', { name: 'Precisa de intervenção' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Horizonte de entregas'), { target: { value: '14' } });
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'Precisa de intervenção' })).not.toBeInTheDocument();
  expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/management/overview/?days=14', expect.anything());
});

it('distinguishes an empty snapshot from missing information', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...snapshot, exceptions: [], deliveries: [], counts: { ...snapshot.counts, active: 0, attention: 0, unscheduled: 0, deliveries: 0 } });
  render(<ManagementOverview />);
  expect(await screen.findByText(/Sem alertas pelas regras atuais/)).toBeInTheDocument();
  expect(screen.getByText(/Sem entregas confirmadas neste horizonte/)).toBeInTheDocument();
  expect(screen.queryByText('A operação está em dia.')).not.toBeInTheDocument();
});

it('paginates intervention records without dropping the aggregate total', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...snapshot, exceptions: Array.from({ length: 9 }, (_, i) => ({ ...job, reference: `MP-${i}`, client_name: `Cliente ${i}` })) });
  render(<ManagementOverview />);
  const nav = await screen.findByRole('navigation', { name: 'Paginação de alertas' });
  expect(screen.queryByText(/MP-8 · Cliente 8/)).not.toBeInTheDocument();
  fireEvent.click(within(nav).getByRole('button', { name: 'Seguinte' }));
  expect(screen.getByRole('link', { name: /MP-8 · Cliente 8/ })).toBeInTheDocument();
  expect(within(nav).getByText('9 alertas · Página 2 de 2')).toBeInTheDocument();
});

it('does not fetch management data without permission', () => {
  allowed = false;
  render(<ManagementOverview />);
  expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso');
  expect(fetchWithAuth).not.toHaveBeenCalled();
});
