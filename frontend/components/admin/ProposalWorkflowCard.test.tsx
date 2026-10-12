import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import type { AdminQuote } from '@/lib/admin-api';
import { ProposalWorkflowCard } from './ProposalWorkflowCard';

let review = false;
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ can: (capability: string) => capability === 'quotes.review' ? review : true }) }));
const quote = { reference: 'MP-0001-2026', final_price: 1000, proposal_workflow: { stage: 'draft', stage_display: 'Em preparação', version: 0, prepared_by: 'Receção', can_review: true, history: [] } } as unknown as AdminQuote;
beforeEach(() => { review = false; vi.resetAllMocks(); });
describe('Proposal workflow', () => {
  it('reception submits the current version but cannot approve internally', async () => {
    const onChange = vi.fn();
    vi.mocked(fetchWithAuth).mockResolvedValue(quote);
    render(<ProposalWorkflowCard quote={quote} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Aprovar internamente' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submeter proposta para aprovação' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const options = vi.mocked(fetchWithAuth).mock.calls[0][1];
    expect(JSON.parse(options?.body as string)).toEqual({ action: 'submit', version: 0, comment: '' });
  });
  it('commercial must give a reason to return a proposal, without accepting for the client', () => {
    review = true;
    render(<ProposalWorkflowCard quote={{ ...quote, proposal_workflow: { ...quote.proposal_workflow!, stage: 'review', stage_display: 'Aguarda aprovação interna', version: 1 } }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Devolver para ajustes' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Observações da submissão / revisão'), { target: { value: 'Rever o prazo' } });
    expect(screen.getByRole('button', { name: 'Devolver para ajustes' })).toBeEnabled();
    expect(screen.getByText('Ainda não aceite')).toBeInTheDocument();
  });
  it('contributors cannot approve their own proposal', () => {
    review = true;
    render(<ProposalWorkflowCard quote={{ ...quote, proposal_workflow: { ...quote.proposal_workflow!, stage: 'review', can_review: false } }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Aprovar internamente' })).toBeDisabled();
    expect(screen.getByText(/Quem participou na preparação/)).toBeInTheDocument();
  });
});
