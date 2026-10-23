import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientProposalReview } from './ClientProposalReview';
import { proposalRequest, type ClientProposal } from '@/lib/proposal-review';

vi.mock('@/lib/proposal-review', async (load) => ({ ...await load<typeof import('@/lib/proposal-review')>(), proposalRequest: vi.fn() }));
const proposal: ClientProposal = {
  reference: 'MP-0001-2026', version: 2, client_name: 'Empresa Horizonte', total: '232', subtotal: '200',
  discount: '0', tax_rate: '16', tax_amount: '32', vat_exempt: false, valid_until: '2026-12-31',
  delivery_days: 7, payment: '50% adiantado + 50% na entrega', terms: 'Condições acordadas', notes: 'Arte sujeita a aprovação',
  expired: false, decision: null, items: [{ description: 'Polos de campanha', quantity: 2, unit_price: '100', notes: 'Bordado no peito', specifications: 'Algodão' }],
};
function reply(data: unknown) { return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => {
  window.history.replaceState({}, '', '/proposta#token=synthetic-review-link');
  vi.mocked(proposalRequest).mockReset().mockResolvedValue(reply(proposal));
});
describe('Client proposal review', () => {
  it('opens only for reading and offers optional registration without accepting', async () => {
    render(<ClientProposalReview />);
    expect(await screen.findByText('Empresa Horizonte')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar a minha conta' })).toHaveAttribute('href', '/area-cliente/registo');
    expect(proposalRequest).toHaveBeenCalledTimes(1);
    expect(proposalRequest).toHaveBeenCalledWith('synthetic-review-link', { action: 'view' }, expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'Confirmar decisão' })).toBeDisabled();
  });
  it('submits the exact version only after explicit confirmation', async () => {
    render(<ClientProposalReview />);
    await screen.findByText('Empresa Horizonte');
    fireEvent.change(screen.getByLabelText('O seu nome'), { target: { value: 'Dário' } });
    fireEvent.click(screen.getByRole('checkbox'));
    vi.mocked(proposalRequest).mockResolvedValueOnce(reply({ ...proposal, decision: { client_decision: 'accept', channel: 'link', at: '2026-10-23' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisão' }));
    expect(await screen.findByText('Proposta aceite')).toBeInTheDocument();
    expect(proposalRequest).toHaveBeenLastCalledWith('synthetic-review-link', expect.objectContaining({ action: 'accept', version: 2, contact_name: 'Dário', confirmed: true }));
    expect(screen.queryByRole('button', { name: 'Confirmar decisão' })).not.toBeInTheDocument();
  });
  it('requests a reason for changes and keeps questions independent of decisions', async () => {
    render(<ClientProposalReview />);
    await screen.findByText('Empresa Horizonte');
    fireEvent.click(screen.getByRole('radio', { name: 'Pedir alterações' }));
    expect(screen.getByLabelText('O que pretende alterar ou qual é o motivo?')).toBeRequired();
    fireEvent.change(screen.getByLabelText('A sua pergunta'), { target: { value: 'Qual é o acabamento?' } });
    vi.mocked(proposalRequest).mockResolvedValueOnce(reply({ detail: 'Pergunta enviada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    await waitFor(() => expect(proposalRequest).toHaveBeenLastCalledWith('synthetic-review-link', { action: 'question', body: 'Qual é o acabamento?' }));
    expect(await screen.findByText('Pergunta enviada')).toBeInTheDocument();
  });
  it('shows expiry without allowing a decision', async () => {
    vi.mocked(proposalRequest).mockResolvedValue(reply({ ...proposal, expired: true }));
    render(<ClientProposalReview />);
    expect(await screen.findByText(/Esta proposta expirou/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar decisão' })).not.toBeInTheDocument();
  });
  it('fails closed on an invalid link', async () => {
    vi.mocked(proposalRequest).mockRejectedValue(new Error('Link inválido ou substituído'));
    render(<ClientProposalReview />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido');
    expect(screen.queryByText('Empresa Horizonte')).not.toBeInTheDocument();
  });
});
