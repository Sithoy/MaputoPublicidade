import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import type { AdminQuote } from '@/lib/admin-api';
import { ProposalWorkflowCard } from './ProposalWorkflowCard';

let manage = true;
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ can: (capability: string) => capability === 'quotes.manage' && manage }) }));
const quote = { reference: 'MP-0001-2026', final_price: 1000, items: [{ id: 1, description: 'Polos', quantity: 200 }], proposal_workflow: { stage: 'draft', stage_display: 'Em preparação', version: 0, prepared_by: 'Recepção', can_review: false, history: [] } } as unknown as AdminQuote;
beforeEach(() => { manage = true; vi.resetAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true); });

describe('Direct proposal workflow', () => {
  it('lets reception save without internal approval', async () => {
    const onChange = vi.fn();
    vi.mocked(fetchWithAuth).mockResolvedValue(quote);
    render(<ProposalWorkflowCard quote={quote} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /aprova/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(quote));
    expect(JSON.parse(vi.mocked(fetchWithAuth).mock.calls[0][1]?.body as string)).toEqual({ action: 'save', version: 0, comment: '' });
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('sends the draft directly using its current version, keeping client acceptance distinct', async () => {
    const onChange = vi.fn();
    vi.mocked(fetchWithAuth).mockResolvedValue(quote);
    render(<ProposalWorkflowCard quote={quote} onChange={onChange} />);
    expect(screen.getByText('Ainda não aceite')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta ao cliente' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(JSON.parse(vi.mocked(fetchWithAuth).mock.calls[0][1]?.body as string)).toEqual({ action: 'send', version: 0, comment: '' });
    expect(window.confirm).toHaveBeenCalledOnce();
  });

  it('does not send when confirmation is cancelled', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<ProposalWorkflowCard quote={quote} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta ao cliente' }));
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });

  it('makes old review-stage proposals actionable without a different reviewer', () => {
    render(<ProposalWorkflowCard quote={{ ...quote, proposal_workflow: { ...quote.proposal_workflow!, stage: 'review', version: 1 } }} onChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Pronta para enviar · v1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar proposta ao cliente' })).toBeEnabled();
    expect(screen.queryByText(/Aguarde outro Comercial/)).not.toBeInTheDocument();
  });

  it('requires a price and items before either action', () => {
    render(<ProposalWorkflowCard quote={{ ...quote, final_price: undefined, items: [] }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Guardar proposta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar proposta ao cliente' })).toBeDisabled();
  });

  it('does not offer actions without quote-management permission', () => {
    manage = false;
    render(<ProposalWorkflowCard quote={quote} onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not resend or save an already sent version', () => {
    render(<ProposalWorkflowCard quote={{ ...quote, proposal_workflow: { ...quote.proposal_workflow!, stage: 'sent' } }} onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reports failures and leaves the proposal available for retry', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('A versão mudou.'));
    render(<ProposalWorkflowCard quote={quote} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar proposta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A versão mudou.');
    expect(screen.getByRole('button', { name: 'Guardar proposta' })).toBeEnabled();
  });
});
