import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareProposal } from '@/lib/admin-api';
import { ProposalAssistant } from './ProposalAssistant';

vi.mock('@/lib/admin-api', () => ({ prepareProposal: vi.fn() }));

describe('ProposalAssistant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reviews sources and unknown quantities before applying, without creating a quote', async () => {
    const result = { id: 1, files: [], draft: {
      client_name: 'Ana', client_email: '', client_phone: '', client_company: '',
      summary: 'Pedido de cartões', requested_deadline: 'Sexta-feira',
      questions: ['Qual é a quantidade?'],
      items: [{ description: 'Cartões', quantity: null, specifications: 'Papel mate', source: 'mensagem: cartões mate' }],
    } };
    vi.mocked(prepareProposal).mockResolvedValue(result);
    const apply = vi.fn();
    render(<ProposalAssistant onApply={apply} />);
    expect(screen.getByRole('button', { name: 'Organizar pedido' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mensagem ou transcrição'), { target: { value: 'Preciso de cartões mate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Organizar pedido' }));
    expect(await screen.findByText(/Quantidade por confirmar/)).toBeInTheDocument();
    expect(screen.getByText('Qual é a quantidade?')).toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar ao formulário' }));
    expect(apply).toHaveBeenCalledWith(result);
    expect(screen.getByRole('button', { name: /Rascunho aplicado/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mensagem ou transcrição'), { target: { value: 'Pedido corrigido' } });
    expect(screen.queryByText('Rascunho para conferência')).not.toBeInTheDocument();
  });

  it('keeps the manual path available if AI is not configured', async () => {
    vi.mocked(prepareProposal).mockRejectedValue(new Error('POST failed: 503'));
    render(<ProposalAssistant onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Mensagem ou transcrição'), { target: { value: '200 cartões' } });
    fireEvent.click(screen.getByRole('button', { name: 'Organizar pedido' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('formulário manual');
  });

  it('blocks oversized attachments before sending client data', async () => {
    render(<ProposalAssistant onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Anexos do cliente'), { target: { files: [new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'huge.png')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Organizar pedido' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('2 MB por ficheiro'));
    expect(prepareProposal).not.toHaveBeenCalled();
  });
});
