import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReceptionRequestPanel } from './ReceptionRequestPanel';
import { type ReceptionRequest, updateReception } from '@/lib/reception-api';

vi.mock('@/lib/reception-api', () => ({ updateReception: vi.fn() }));
afterEach(() => vi.clearAllMocks());
const request: ReceptionRequest = {
  reference: 'MP-0001-2026', client_name: 'Empresa ABC', client_email: 'cliente@example.com', client_phone: '', client_nuit: '',
  contact_source: 'phone', urgency: 'normal', status: 'reviewing', notes: 'Precisamos de cartões', created_at: '2026-10-10',
  reception_owner: 1, owner_name: 'Recepção MP', reception_notes: '', missing_information: [],
  items: [{ description: 'Cartões', quantity: 100 }], deadline: null,
};

describe('ReceptionRequestPanel', () => {
  it('saves contact details without price fields and requires saving before handoff', async () => {
    const onChange = vi.fn();
    vi.mocked(updateReception).mockResolvedValue({ ...request, client_phone: '841234567' });
    render(<ReceptionRequestPanel request={request} userId={1} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '841234567' } });
    expect(screen.getByRole('button', { name: 'Encaminhar ao Comercial' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar triagem' }));
    await waitFor(() => expect(updateReception).toHaveBeenCalledWith(request.reference, 'edit', {
      client_name: request.client_name, client_email: request.client_email, client_phone: '841234567', client_nuit: '', reception_notes: '',
    }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ client_phone: '841234567' }));
  });

  it('hands off the same request and closes the triage panel', async () => {
    const onChange = vi.fn();
    vi.mocked(updateReception).mockResolvedValue({ reference: request.reference });
    render(<ReceptionRequestPanel request={request} userId={1} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Encaminhar ao Comercial' }));
    await waitFor(() => expect(updateReception).toHaveBeenCalledWith(request.reference, 'handoff', {}));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('does not allow editing another person’s attendance', () => {
    render(<ReceptionRequestPanel request={request} userId={2} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Telefone')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Encaminhar ao Comercial' })).not.toBeInTheDocument();
  });

  it('keeps the draft when saving fails', async () => {
    vi.mocked(updateReception).mockRejectedValue(new Error('Falha de ligação'));
    render(<ReceptionRequestPanel request={request} userId={1} onChange={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Notas internas para o Comercial'), { target: { value: 'Prazo a confirmar.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar triagem' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de ligação');
    expect(screen.getByLabelText('Notas internas para o Comercial')).toHaveValue('Prazo a confirmar.');
  });
});
