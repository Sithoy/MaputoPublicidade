import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestTracking } from './RequestTracking';

const detail = { reference: 'MP-0001-2026', order_reference: null, title: '200 cadernos', step: 0, status: 'Pedido recebido', next_action: 'Ainda não é uma ordem de produção.', scheduled_date: null };
const fetchMock = vi.fn();
beforeEach(() => {
  sessionStorage.clear(); window.history.replaceState(null, '', '/acompanhar');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path: string) => ({ ok: true, json: async () => path.includes('detail') ? detail : path.includes('lookup') ? { detail: 'Se os dados corresponderem, receberá um link.' } : { messages: [] } }));
});
afterEach(() => vi.unstubAllGlobals());

describe('Request tracking', () => {
  it('asks for email verification and does not load private data without a token', () => {
    render(<RequestTracking />);
    expect(screen.getByLabelText('Referência do pedido')).toBeInTheDocument();
    expect(screen.getByLabelText('Email do pedido')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('uses a fragment credential in a header and opens read-only tracking', async () => {
    window.history.replaceState(null, '', '/acompanhar#token=private-token');
    render(<RequestTracking />);
    expect(await screen.findByText('200 cadernos')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(fetchMock).toHaveBeenCalledWith('/api/tracking/detail/', expect.objectContaining({ headers: expect.objectContaining({ 'X-MP-Tracking-Token': 'private-token' }), cache: 'no-store' }));
    expect(screen.getByText('Data de entrega ainda por confirmar com a MP.')).toBeInTheDocument();
    expect(screen.getByText('Ainda não é uma ordem de produção.')).toBeInTheDocument();
  });
  it('opens a contextual chat and sends the message without accepting another reference', async () => {
    sessionStorage.setItem('mp-tracking-v1', 'private-token');
    render(<RequestTracking />); await screen.findByText('200 cadernos');
    fireEvent.click(screen.getByRole('button', { name: 'Falar sobre este pedido' }));
    fireEvent.change(screen.getByLabelText('A sua mensagem'), { target: { value: 'Preciso de uma atualização.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar à Recepção' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tracking/messages/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ body: 'Preciso de uma atualização.' }) })));
    await waitFor(() => expect(screen.getByLabelText('A sua mensagem')).toHaveValue(''));
  });
  it('offers recovery on expiry without showing tracking details', async () => {
    sessionStorage.setItem('mp-tracking-v1', 'expired');
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    render(<RequestTracking />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido ou expirado');
    expect(screen.getByLabelText('Email do pedido')).toBeInTheDocument();
    expect(screen.queryByText('200 cadernos')).not.toBeInTheDocument();
  });
});
