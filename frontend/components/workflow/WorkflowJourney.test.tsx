import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { WorkflowJourney } from './WorkflowJourney';
import { workflowStages, type JobJourney, getClientNextAction } from '@/lib/workflow';

const journey: JobJourney = { key: 'art_client', index: 4, label: 'Aprovação da arte', cancelled: false, needs_art: true, team: 'Cliente', blocker: 'Decisão da arte', next_action: 'Rever e decidir a arte', steps: workflowStages.map((stage) => ({ key: stage.key, label: stage.shortLabel, skipped: false })) };
it('uses the backend art stage rather than the broad approved order status', () => {
  render(<WorkflowJourney status="approved" journey={journey} />);
  expect(screen.getByText('Aprovação da arte').closest('li')).toHaveAttribute('aria-current', 'step');
  expect(getClientNextAction({ status: 'approved', payment_status: 'pending', amount_due: 100, journey }).label).toBe('Rever e decidir a arte');
});
it('explicitly marks optional art stages without blocking no-art production', () => {
  render(<WorkflowJourney status="approved" journey={{ ...journey, key: 'production', index: 5, needs_art: false, steps: journey.steps.map((step, i) => ({ ...step, skipped: i === 3 || i === 4 })) }} />);
  expect(screen.getAllByText('Não necessária')).toHaveLength(2);
  expect(screen.getByText('Produção').closest('li')).toHaveAttribute('aria-current', 'step');
});
it('honours cancellation even if the broad order status has not caught up', () => {
  expect(getClientNextAction({ status: 'approved', payment_status: 'pending', journey: { ...journey, cancelled: true } }).label).toBe('Pedido cancelado');
});
