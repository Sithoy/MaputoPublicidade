import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { WhatsAppTemplateComposer } from './WhatsAppTemplateComposer';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const template = { id: '111', name: 'orcamento_pronto', language: 'pt_PT', revision: 'a'.repeat(64), supported: true, reason: '', texts: [{ type: 'body', text: 'Olá {{cliente}}' }], variables: [{ key: 'body:cliente', name: 'cliente', component: 'body' }] };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue({ results: [template], after: '' }); });

describe('WhatsApp templates', () => {
  it('requires selection, values, consent record and explicit confirmation before sending', async () => {
    const onSent = vi.fn();
    render(<WhatsAppTemplateComposer conversationId={7} onSent={onSent} onSending={vi.fn()} />);
    expect(fetchWithAuth).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar template aprovado' }));
    await screen.findByRole('option', { name: /orcamento_pronto/ });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: '111' } });
    expect(screen.getByRole('button', { name: 'Enviar template' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mensagem · cliente'), { target: { value: 'Dário' } });
    expect(screen.getByText('Olá Dário')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Registo da autorização do cliente'), { target: { value: 'Email autorizado' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar template' }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    const options = vi.mocked(fetchWithAuth).mock.calls.find(([, opts]) => opts?.method === 'POST')?.[1];
    expect(JSON.parse(options?.body as string)).toEqual({ template_id: '111', name: template.name, revision: template.revision, language: 'pt_PT', parameters: { 'body:cliente': 'Dário' }, consent_note: 'Email autorizado', confirmed: true });
  });
  it('keeps a failed send visible and does not automatically retry', async () => {
    const onFailed = vi.fn();
    vi.mocked(fetchWithAuth).mockImplementation(async (_, options) => {
      if (options?.method === 'POST') throw new Error('Envio não confirmado. Verifique no telefone.');
      return { results: [template], after: '' };
    });
    render(<WhatsAppTemplateComposer conversationId={7} onSent={vi.fn()} onSending={vi.fn()} onFailed={onFailed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar template aprovado' }));
    await screen.findByRole('option', { name: /orcamento_pronto/ });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: '111' } });
    fireEvent.change(screen.getByLabelText('Mensagem · cliente'), { target: { value: 'Dário' } });
    fireEvent.change(screen.getByLabelText('Registo da autorização do cliente'), { target: { value: 'Email' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Envio não confirmado');
    expect(screen.getByLabelText('Mensagem · cliente')).toHaveValue('Dário');
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchWithAuth).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  });
});
