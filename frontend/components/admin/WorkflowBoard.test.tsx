import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { WorkflowBoard } from './WorkflowBoard';

const replace = vi.fn();
let query = '';
let allowed = true;
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams(query) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: (key: string) => allowed && ['orders.view', 'reception.manage'].includes(key) }) }));
const snapshot = { generated_at: '2026-11-02T10:00:00Z', results: [{ reference: 'MP-0001-2026', quote_reference: 'MP-0001-2026', order_reference: 'ORD-0001', client_name: 'Empresa Horizonte', summary: '200 polos', journey: { key: 'art_client', index: 4, team: 'Cliente', blocker: 'Decisão do cliente sobre a arte', next_action: 'Rever e decidir a arte' } }], count: 1, page: 1, page_size: 80, counts: { art_client: 1 } };
beforeEach(() => { allowed = true; query = ''; vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue(snapshot); });

it('groups art approval inside Arte, keeps five columns and links the same request', async () => {
  render(<WorkflowBoard />);
  const card = await screen.findByRole('link', { name: /Empresa Horizonte/ });
  expect(card).toHaveAttribute('href', '/admin/recepcao?pedido=MP-0001-2026');
  expect(within(screen.getByRole('region', { name: 'Arte' })).getByText('200 polos')).toBeInTheDocument();
  expect(screen.getAllByRole('region')).toHaveLength(5);
  expect(within(card).getByText('Aguarda aprovação da arte')).toBeInTheDocument();
  expect(within(card).queryByText(/Bloqueado/)).not.toBeInTheDocument();
  expect(card).toHaveClass('border-l-slate-200');
  expect(screen.getAllByText('MP-0001-2026')).toHaveLength(1);
  expect(screen.queryByText('Em dívida')).not.toBeInTheDocument();
});

it('uses shareable stage and search filters without changing job statuses', async () => {
  render(<WorkflowBoard />);
  await screen.findByText('Empresa Horizonte');
  fireEvent.change(screen.getByLabelText('Fase'), { target: { value: 'production' } });
  expect(replace).toHaveBeenCalledWith('/admin/quadro?column=production');
  fireEvent.change(screen.getByLabelText('Pesquisar no quadro'), { target: { value: 'polos' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
  expect(replace).toHaveBeenCalledWith('/admin/quadro?search=polos');
  expect(vi.mocked(fetchWithAuth).mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
});

it('keeps a failed refresh marked stale and does not relabel data after changing filters', async () => {
  const { rerender } = render(<WorkflowBoard />);
  await screen.findByText('Empresa Horizonte');
  vi.mocked(fetchWithAuth).mockRejectedValue(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  await screen.findByRole('alert');
  expect(screen.getByText('Empresa Horizonte')).toBeInTheDocument();
  query = 'stage=production';
  rerender(<WorkflowBoard />);
  await waitFor(() => expect(screen.queryByText('Empresa Horizonte')).not.toBeInTheDocument());
});

it('never fetches the board without permission', () => {
  allowed = false; render(<WorkflowBoard />);
  expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso');
  expect(fetchWithAuth).not.toHaveBeenCalled();
});

it('maps old art approval URLs to the grouped art filter', async () => {
  query = 'stage=art_client';
  render(<WorkflowBoard />);
  await screen.findByText('Empresa Horizonte');
  expect(fetchWithAuth).toHaveBeenCalledWith(expect.stringContaining('column=art'), expect.anything());
  expect(screen.getAllByRole('region')).toHaveLength(1);
});

it('marks overdue work red and near-deadline work amber, including approval waits', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...snapshot, results: [
    { ...snapshot.results[0], issues: [{ code: 'followup', kind: 'overdue', label: 'Seguimento em atraso', due: '2026-11-01' }] },
    { ...snapshot.results[0], reference: 'MP-0002-2026', client_name: 'Cliente em risco', issues: [{ code: 'followup', kind: 'risk', label: 'Seguimento próximo', due: '2026-11-04' }] },
  ] });
  render(<WorkflowBoard />);
  expect(await screen.findByRole('link', { name: /Empresa Horizonte/ })).toHaveClass('border-l-red-500');
  expect(screen.getByRole('link', { name: /Cliente em risco/ })).toHaveClass('border-l-amber-500');
});

it('distinguishes technical blockers from ready work and keeps delivered jobs out of active columns', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({ ...snapshot, results: [
    { ...snapshot.results[0], journey: { ...snapshot.results[0].journey, key: 'production', blocker: 'Informação técnica por confirmar' } },
    { ...snapshot.results[0], reference: 'MP-0002-2026', client_name: 'Cliente pronto', delivery_method: 'delivery', journey: { ...snapshot.results[0].journey, key: 'delivery', blocker: '' } },
    { ...snapshot.results[0], reference: 'MP-0003-2026', client_name: 'Cliente entregue', journey: { ...snapshot.results[0].journey, key: 'delivered', blocker: '' } },
  ] });
  render(<WorkflowBoard />);
  const blocked = await screen.findByRole('link', { name: /Empresa Horizonte/ });
  expect(blocked).toHaveClass('border-l-red-500');
  expect(within(blocked).getByText(/Bloqueado/)).toBeInTheDocument();
  const ready = screen.getByRole('link', { name: /Cliente pronto/ });
  expect(ready).toHaveClass('border-l-emerald-600');
  expect(within(ready).getByText('Entrega no local')).toBeInTheDocument();
  expect(screen.queryByText('Cliente entregue')).not.toBeInTheDocument();
});
