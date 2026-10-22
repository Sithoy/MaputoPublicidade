import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReceptionQueue, type QueueQuote } from './ReceptionQueue';

const quote: QueueQuote = {
  id: 1, client_email: 'cliente@example.com', created_at: '2026-10-22T08:00:00Z',
  reference: 'MP-0001-2026', client_name: 'Dário', client_company: 'Empresa ABC',
  status: 'reviewing', urgency: 'urgent', job_summary: '200 polos para campanha', items: [],
  proposal_workflow: {
    stage: 'sent', stage_display: 'Enviada', version: 1, owner_id: null, prepared_by: '',
    prepared_by_id: null, can_review: false, reviewed_by: '', reviewed_at: null,
    comment: '', sent_at: '2026-10-22T08:00:00Z', history: [],
  },
  workdesk: {
    stage_label: 'Com o cliente', next_action: 'Acompanhar decisão', blocker: 'Decisão do cliente',
    follow_up_date: '2026-10-23', confirmed_date: null, requested_date: '2026-10-25',
    waiting_since: null, owner_id: null, owner_name: '', follow_up_note: '', last_contact_at: null,
  },
};

function setup(overrides: Partial<Parameters<typeof ReceptionQueue>[0]> = {}) {
  const onOpen = vi.fn();
  render(<ReceptionQueue rows={[quote]} count={1} loading={false} busy={false} task="all" onOpen={onOpen} {...overrides} />);
  return onOpen;
}

describe('Reception compact task table', () => {
  it('aligns the client, work, status, next action and commitment under semantic headers', () => {
    setup();
    const table = screen.getByRole('table', { name: 'Tarefas da recepção' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Cliente / referência', 'Trabalho', 'Estado', 'Próxima ação', 'Compromisso', 'Abrir pedido',
    ]);
    for (const value of ['Empresa ABC', 'MP-0001-2026', '200 polos para campanha', 'Com o cliente', 'Acompanhar decisão', 'Decisão do cliente', 'Urgente', 'Seguimento']) {
      expect(within(table).getByText(value)).toBeInTheDocument();
    }
    expect(within(table).getAllByRole('row')).toHaveLength(2);
  });

  it('opens once from either a row or its accessible button', () => {
    const onOpen = setup();
    fireEvent.click(screen.getByText('200 polos para campanha'));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(quote.reference);
    onOpen.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'MP-0001-2026 Empresa ABC — Abrir atendimento' }));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(quote.reference);
  });

  it.each([{ busy: true }, { loading: true }])('blocks row and button opening while unavailable: %j', (state) => {
    const onOpen = setup(state);
    const button = screen.getByRole('button', { name: /Abrir atendimento/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.click(screen.getByText('Empresa ABC'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens through keyboard activation of the row button', async () => {
    const user = userEvent.setup();
    const onOpen = setup();
    screen.getByRole('button', { name: /Abrir atendimento/ }).focus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(quote.reference);
  });

  it('does not present a requested deadline as a confirmed commitment', () => {
    setup({ rows: [{ ...quote, workdesk: { ...quote.workdesk!, follow_up_date: null, confirmed_date: null } }] });
    expect(screen.getByText('Por agendar')).toBeInTheDocument();
    expect(screen.queryByText('Agendado')).not.toBeInTheDocument();
    expect(screen.queryByText('Seguimento')).not.toBeInTheDocument();
  });

  it('labels confirmed dates and identifies an active editor without blocking consultation', () => {
    setup({ rows: [{ ...quote, workdesk: { ...quote.workdesk!, follow_up_date: null, confirmed_date: '2026-10-24T10:00:00+02:00', edit_session: { editor_name: 'Ana' } as NonNullable<QueueQuote['workdesk']>['edit_session'] } }] });
    expect(screen.getByText('Agendado')).toBeInTheDocument();
    expect(screen.getByText('Em edição por Ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir atendimento/ })).toBeEnabled();
  });

  it('handles legacy records with no workdesk or item details', () => {
    setup({ rows: [{ ...quote, workdesk: undefined, job_summary: '', items: undefined } as unknown as QueueQuote] });
    expect(screen.getByText('Necessidade por confirmar')).toBeInTheDocument();
    expect(screen.getByText('Consultar pedido')).toBeInTheDocument();
  });

  it('announces initial loading without displaying an empty queue', () => {
    setup({ rows: [], loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('A organizar os atendimentos');
    expect(screen.queryByText('Nenhum pedido neste filtro.')).not.toBeInTheDocument();
  });
});
