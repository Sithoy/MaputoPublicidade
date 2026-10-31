import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { StudioHome } from './StudioHome';

let allowed = true;
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => allowed, user: { first_name: 'Ana' } }) }));
vi.mock('./ProductionWorkspace', () => ({ ProductionWorkspace: ({ initialReference, onClose }: { initialReference: string; onClose: () => void }) => <div>Trabalho {initialReference}<button onClick={onClose}>Voltar à agenda</button></div> }));
const agenda = {
  count: 12, next: '?page=2', overview: { all: 12, new: 4, revisions: 2, draft: 1, approval: 3, followup: 1, ready: 2 },
  results: [{ reference: 'MP-0001-2026', client_name: 'Empresa ABC', description: 'Polos', task: 'revisions', version: 2, followup: false, published_at: null, scheduled_date: null }],
};
beforeEach(() => { allowed = true; vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue(agenda); });

describe('Studio agenda', () => {
  it('welcomes the designer, shows priorities and opens a focused job', async () => {
    render(<StudioHome />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Olá, Ana');
    const open = await screen.findByRole('button', { name: 'Rever alterações · MP-0001-2026' });
    expect(screen.getByText('Por agendar')).toBeInTheDocument();
    fireEvent.click(open);
    expect(screen.getByText('Trabalho MP-0001-2026')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Voltar à agenda'));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
  it('filters on the server and uses ten-item pagination', async () => {
    render(<StudioHome />);
    fireEvent.click(await screen.findByRole('button', { name: 'Seguinte' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/production/studio/?task=all&page=2&search='));
    fireEvent.click(screen.getAllByRole('button', { name: 'Recontactar cliente' })[0]);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/production/studio/?task=followup&page=1&search='));
    expect(screen.getByText('10 por página')).toBeInTheDocument();
  });
  it('searches by client and preserves full-queue priorities', async () => {
    render(<StudioHome />);
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Pesquisar trabalhos'), { target: { value: 'ABC' } });
    await waitFor(() => expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/production/studio/?task=all&page=1&search=ABC'));
    expect(screen.getByText('Fila partilhada da equipa de Artes')).toBeInTheDocument();
  });
  it('shows failure and offers retry instead of a false empty queue', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Offline'));
    render(<StudioHome />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('A bancada está em dia')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Atualizar agenda'));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
  it('does not fetch data without role permission', () => {
    allowed = false;
    render(<StudioHome />);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso');
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
});
