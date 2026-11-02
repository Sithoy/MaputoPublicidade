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

it('places one job in the art approval column and links reception to the same request', async () => {
  render(<WorkflowBoard />);
  const card = await screen.findByRole('link', { name: /Empresa Horizonte/ });
  expect(card).toHaveAttribute('href', '/admin/recepcao?pedido=MP-0001-2026');
  expect(within(screen.getByRole('region', { name: 'Aprovação da arte' })).getByText('200 polos')).toBeInTheDocument();
  expect(screen.getAllByText('MP-0001-2026')).toHaveLength(1);
  expect(screen.queryByText('Em dívida')).not.toBeInTheDocument();
});

it('uses shareable stage and search filters without changing job statuses', async () => {
  render(<WorkflowBoard />);
  await screen.findByText('Empresa Horizonte');
  fireEvent.change(screen.getByLabelText('Etapas'), { target: { value: 'production' } });
  expect(replace).toHaveBeenCalledWith('/admin/quadro?stage=production');
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
