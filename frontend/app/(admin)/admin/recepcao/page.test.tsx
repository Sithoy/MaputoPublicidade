import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getReceptionQueue, getReceptionSummary } from '@/lib/reception-api';
import ReceptionPage from './page';

const auth = vi.hoisted(() => ({ loading: false }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ user: { id: 1 }, loading: auth.loading, can: () => true }) }));
vi.mock('@/lib/reception-api', () => ({ getReceptionQueue: vi.fn(), getReceptionSummary: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); auth.loading = false; });

function setup() {
  vi.mocked(getReceptionSummary).mockResolvedValue({ counts: { queue: 30, unassigned: 25, mine: 5, messages: 2, ready: 0 },
    messages: [{ id: 7, subject: 'Prazo de entrega', client_name: 'Empresa ABC' }], ready: [], handovers: [] });
  vi.mocked(getReceptionQueue).mockResolvedValue({ results: [], next: null });
}

describe('Reception workspace', () => {
  it('uses server totals and links to the existing intake and support flow', async () => {
    setup(); render(<ReceptionPage />);
    expect(await screen.findByText('Fila de triagem (30)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo atendimento' })).toHaveAttribute('href', '/admin/orcamentos/novo');
    expect(screen.getByRole('link', { name: /Empresa ABC Prazo de entrega/ })).toHaveAttribute('href', '/admin/apoio?conversa=7');
    fireEvent.click(screen.getByRole('button', { name: /Os meus atendimentos/ }));
    await waitFor(() => expect(getReceptionQueue).toHaveBeenCalledWith('mine'));
  });

  it('does not load operational data before authentication finishes', () => {
    setup(); auth.loading = true; render(<ReceptionPage />);
    expect(getReceptionSummary).not.toHaveBeenCalled();
    expect(getReceptionQueue).not.toHaveBeenCalled();
  });

  it('reports API failure rather than displaying invented zero totals', async () => {
    setup(); vi.mocked(getReceptionSummary).mockRejectedValue(new Error('Offline'));
    render(<ReceptionPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('Fila de triagem (0)')).not.toBeInTheDocument();
  });
});
