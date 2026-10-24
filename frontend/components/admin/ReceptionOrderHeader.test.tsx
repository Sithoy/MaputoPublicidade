import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdminQuote } from '@/lib/admin-api';
import { ReceptionOrderHeader } from './ReceptionOrderHeader';
import { ReceptionCaseContext } from './ReceptionCaseContext';

const quote = { reference: 'MP-0009-2026', client_company: 'Empresa Horizonte', client_name: 'Compras',
  client_email: 'compras@example.test', client_phone: '+258 84 123 4567', client_nuit: '400123456', status: 'quoted',
  items: [{ id: 1, description: 'Painel luminoso', quantity: 1 }], proposal_workflow: { stage: 'sent' },
  workdesk: { stage_label: 'Com o cliente', next_action: 'Acompanhar decisão', blocker: 'Decisão do cliente',
    follow_up_date: null, last_contact_at: null, waiting_since: null, confirmed_date: null, requested_date: '2026-12-20' },
} as AdminQuote;

function setup(focused = false, busy = false) {
  const onStep = vi.fn(), onTab = vi.fn(), onAction = vi.fn();
  render(<ReceptionOrderHeader quote={quote} step={2} tab="summary" focused={focused} busy={busy} onStep={onStep} onTab={onTab} onAction={onAction} editControls={<span>Consulta partilhada</span>}>
    {(action) => <ReceptionCaseContext quote={quote} compact={focused} nextAction={action} canSchedule={false} busy={busy} onBusy={vi.fn()} onDirty={vi.fn()} onSaved={vi.fn()} />}
  </ReceptionOrderHeader>);
  return { onStep, onTab, onAction };
}

describe('Compact operational frame', () => {
  it('keeps one identity, contact shortcuts and one contextual next action', () => {
    const { onAction } = setup();
    expect(screen.getAllByRole('heading', { name: 'Empresa Horizonte' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'compras@example.test' })).toHaveAttribute('href', 'mailto:compras@example.test');
    expect(screen.getByRole('link', { name: '+258 84 123 4567' })).toHaveAttribute('href', 'tel:+258841234567');
    expect(screen.getAllByRole('region', { name: 'Próxima ação' })).toHaveLength(1);
    expect(screen.getByText('Consulta partilhada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Acompanhar decisão' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('preserves stage navigation while moving documents and history to a secondary menu', () => {
    const { onStep, onTab } = setup();
    fireEvent.click(screen.getByRole('button', { name: '2 Preparar proposta' }));
    expect(onStep).toHaveBeenCalledWith(1);
    const tabs = within(screen.getByRole('navigation', { name: 'Contexto do pedido' }));
    fireEvent.click(tabs.getByRole('button', { name: /^Cliente$/ }));
    expect(onTab).toHaveBeenCalledWith('work');
    fireEvent.click(screen.getByText('Documentos e histórico'));
    fireEvent.click(tabs.getByRole('button', { name: 'Histórico e anexos' }));
    expect(onTab).toHaveBeenCalledWith('history');
  });

  it('does not repeat the generic action panel around a focused workspace', () => {
    setup(true);
    expect(screen.getByRole('heading', { name: 'Empresa Horizonte' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Percurso do pedido' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Próxima ação' })).not.toBeInTheDocument();
  });

  it('keeps navigation disabled while a save or reservation is pending', () => {
    const { onStep, onAction } = setup(false, true);
    fireEvent.click(screen.getByRole('button', { name: '2 Preparar proposta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acompanhar decisão' }));
    expect(onStep).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });
});
