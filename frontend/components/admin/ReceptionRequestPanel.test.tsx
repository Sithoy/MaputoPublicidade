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
  it('hides empty optional fields and shows saved specifications immediately', () => {
    render(<ReceptionRequestPanel request={{ ...request, items: [{ ...request.items[0], size: '85 cm' }] }} userId={1} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('NUIT')).not.toBeVisible();
    expect(screen.getByLabelText('Referência de trabalho anterior')).not.toBeVisible();
    expect(screen.getByLabelText('Dimensões 1')).toBeVisible();
    expect(screen.getByText('Pronto para o Comercial')).toBeInTheDocument();
  });
  it('saves optional dimensions even after the checkbox is cleared', async () => {
    vi.mocked(updateReception).mockResolvedValue(request);
    render(<ReceptionRequestPanel request={request} userId={1} onChange={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Tenho medidas a indicar'));
    fireEvent.change(screen.getByLabelText('Medidas conhecidas'), { target: { value: '85 cm' } });
    fireEvent.click(screen.getByLabelText('Tenho medidas a indicar'));
    expect(screen.queryByLabelText('Medidas conhecidas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar triagem' }));
    await waitFor(() => expect(updateReception).toHaveBeenCalledWith(request.reference, 'edit', expect.objectContaining({ items: [expect.objectContaining({ material_briefing: { needs_dimensions: false, dimensions: '85 cm' } })] })));
  });
  it('does not hide a saved delivery address when changing to pickup', () => {
    render(<ReceptionRequestPanel request={{ ...request, briefing: { project_name: '', description: 'Entrega de cartões', deadline: null, fulfilment: 'delivery', delivery_address: 'Maputo, Rua 1', source_reference: '', needs_design: false, questions: '' } }} userId={1} onChange={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('O cliente precisa de entrega'));
    expect(screen.getByLabelText('Local / endereço de entrega')).toBeVisible();
    expect(screen.getByLabelText('Local / endereço de entrega')).toHaveValue('Maputo, Rua 1');
  });
  it('saves contact details without price fields and requires saving before handoff', async () => {
    const onChange = vi.fn();
    vi.mocked(updateReception).mockResolvedValue({ ...request, client_phone: '841234567' });
    render(<ReceptionRequestPanel request={request} userId={1} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '841234567' } });
    expect(screen.getByRole('button', { name: 'Encaminhar ao Comercial' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar triagem' }));
    await waitFor(() => expect(updateReception).toHaveBeenCalledWith(request.reference, 'edit', expect.objectContaining({
      client_name: request.client_name, client_email: request.client_email, client_phone: '841234567', client_nuit: '', reception_notes: '',
    })));
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

  it('completes the briefing and adds a material without fabricating a quantity', async () => {
    vi.mocked(updateReception).mockResolvedValue(request);
    render(<ReceptionRequestPanel request={request} userId={1} onChange={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Descrição da necessidade'), { target: { value: 'Inauguração da loja' } });
    fireEvent.change(screen.getByLabelText('Data pretendida'), { target: { value: '2026-12-20' } });
    fireEvent.click(screen.getByLabelText('O cliente precisa de entrega'));
    fireEvent.change(screen.getByLabelText('Local / endereço de entrega'), { target: { value: 'Maputo, Rua 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar material' }));
    expect(screen.getByLabelText('Quantidade do material 2')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Descrição do material 2'), { target: { value: 'Roll-up' } });
    fireEvent.change(screen.getByLabelText('Quantidade do material 2'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByLabelText('Tenho medidas a indicar')[1]);
    fireEvent.change(screen.getByLabelText('Medidas conhecidas'), { target: { value: '85 × 200 cm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar triagem' }));
    await waitFor(() => expect(updateReception).toHaveBeenCalledWith(request.reference, 'edit', expect.objectContaining({
      briefing: expect.objectContaining({ description: 'Inauguração da loja', deadline: '2026-12-20', fulfilment: 'delivery', delivery_address: 'Maputo, Rua 1' }),
      items: expect.arrayContaining([expect.objectContaining({ description: 'Roll-up', quantity: 2, material_briefing: { needs_dimensions: true, dimensions: '85 × 200 cm' } })]),
    })));
  });

  it('preserves pending references and briefing when the upload fails', async () => {
    const file = new File(['%PDF-1.4\nreference'], 'referencia.pdf', { type: 'application/pdf' });
    vi.mocked(updateReception).mockRejectedValue(new Error('Falha no envio'));
    render(<ReceptionRequestPanel request={request} userId={1} onChange={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Adicionar referências internas'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar triagem' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no envio');
    expect(screen.getByText('referencia.pdf · por guardar')).toBeInTheDocument();
    expect(updateReception).toHaveBeenCalledWith(request.reference, 'edit', expect.any(Object), [file]);
  });
});
