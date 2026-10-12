import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReceptionOverview } from './ReceptionOverview';

describe('Reception agenda', () => {
  it('answers the three working questions and opens exact queue filters', () => {
    const onTask = vi.fn();
    render(<ReceptionOverview name="Dário" task="today" disabled={false} onTask={onTask} onInbox={vi.fn()} data={{ scope: 'mine', unassigned_team: 2, updated_at: '2026-10-12T08:00:00Z', counts: { total: 5, urgent: 1, messages_general: 0, today: 2, followup: 1, delivery_today: 1 } }} />);
    for (const heading of ['Agora', 'Dia da recepção', 'A acompanhar']) expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pedidos com compromisso hoje/ }));
    expect(onTask).toHaveBeenCalledWith('today');
    fireEvent.click(screen.getByRole('button', { name: /Seguimentos a fazer/ }));
    expect(onTask).toHaveBeenCalledWith('followup');
    expect(screen.getByText(/não transforma a data pretendida/)).toBeInTheDocument();
  });
  it('shows unavailable counts as unknown, not a fabricated zero', () => {
    render(<ReceptionOverview name="" task="all" disabled={false} onTask={vi.fn()} onInbox={vi.fn()} data={null} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Seguimentos/ })).not.toBeInTheDocument();
  });
});
