import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { OperationsHome } from './OperationsHome';

let allowed = true;
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => allowed }) }));
vi.mock('./ProductionWorkspace', () => ({ ProductionWorkspace: ({ workspace, initialReference, onClose }: { workspace: string; initialReference: string; onClose: () => void }) => <div>{workspace} {initialReference}<button onClick={onClose}>Voltar</button></div> }));
const agenda = { results: [{ reference: 'MP-0001-2026', client_name: 'Empresa ABC', description: '200 polos', task: 'new', followup: false, needs_art: true, missing: [], scheduled_date: null }], count: 11, next: '?page=2', overview: { all: 11, new: 1 } };
beforeEach(() => { allowed = true; vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue(agenda); });

it('opens art and production in the same workspace and preserves the queue on return', async () => {
  render(<OperationsHome />);
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir trabalho MP-0001-2026' }));
  expect(screen.getByText('operations MP-0001-2026')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Voltar'));
  expect(await screen.findByRole('button', { name: 'Abrir trabalho MP-0001-2026' })).toBeInTheDocument();
  expect(screen.getByText(/10 por página/)).toBeInTheDocument();
});

it('filters server-side and paginates ten jobs', async () => {
  render(<OperationsHome />);
  fireEvent.click(await screen.findByRole('button', { name: 'Seguinte' }));
  await waitFor(() => expect(fetchWithAuth).toHaveBeenLastCalledWith(expect.stringContaining('page=2')));
  fireEvent.click(screen.getAllByRole('button', { name: /Prontos para produção/ })[0]);
  await waitFor(() => expect(fetchWithAuth).toHaveBeenLastCalledWith(expect.stringContaining('task=ready')));
  expect(vi.mocked(fetchWithAuth).mock.lastCall?.[0]).toContain('page=1');
});

it('does not fetch any data without operational permission', () => {
  allowed = false;
  render(<OperationsHome />);
  expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso');
  expect(fetchWithAuth).not.toHaveBeenCalled();
});

it('shows a failure instead of presenting stale jobs as a new filter result', async () => {
  vi.mocked(fetchWithAuth).mockRejectedValue(new Error('unavailable'));
  render(<OperationsHome />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível');
  expect(screen.queryByRole('button', { name: 'Abrir trabalho MP-0001-2026' })).not.toBeInTheDocument();
});
