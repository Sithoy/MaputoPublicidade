import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBlobWithAuth, fetchWithAuth } from '@/lib/auth';
import { CorrespondenceFiles, CorrespondenceFilePreview } from './CorrespondenceFiles';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn(), fetchBlobWithAuth: vi.fn() }));
const file = { id: 5, name: 'Proposta.pdf', mime_type: 'application/pdf', size: 100, url: '/api/support-conversations/7/files/5/' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchWithAuth).mockImplementation(async (path, options) => {
    if (options?.method === 'POST') return file;
    return path.endsWith('/documents/') ? [{ key: 'proposal', label: 'Proposta aprovada MP-0001-2026' }] : [];
  });
});

describe('Private correspondence files', () => {
  it('uploads multipart files without sending a message', async () => {
    const change = vi.fn();
    await act(async () => { render(<CorrespondenceFiles conversationId={7} ids={[]} onChange={change} />); });
    fireEvent.change(screen.getByLabelText('Anexar ficheiro'), { target: { files: [new File(['%PDF-1.4'], 'Proposta.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(change).toHaveBeenCalledWith([5]));
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/support-conversations/7/files/', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
    expect(vi.mocked(fetchWithAuth).mock.calls.some(([path]) => path.endsWith('/messages/') || path.endsWith('/email-send/'))).toBe(false);
  });
  it('allows staff to select an approved document but not clients', async () => {
    const change = vi.fn();
    const { unmount } = render(<CorrespondenceFiles staff conversationId={7} ids={[]} onChange={change} />);
    await screen.findByRole('option', { name: 'Proposta aprovada MP-0001-2026' });
    fireEvent.change(screen.getByLabelText('Documento do pedido'), { target: { value: 'proposal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anexar documento' }));
    await waitFor(() => expect(change).toHaveBeenCalledWith([5]));
    unmount();
    await act(async () => { render(<CorrespondenceFiles conversationId={7} ids={[]} onChange={change} />); });
    expect(screen.queryByLabelText('Documento do pedido')).not.toBeInTheDocument();
  });
  it('shows file-access failures without rendering untrusted HTML', async () => {
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['<script>bad()</script>'], { type: 'text/html' }));
    render(<CorrespondenceFilePreview file={file} />);
    fireEvent.click(screen.getByRole('button', { name: /Visualizar Proposta/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir o anexo.');
    expect(document.querySelector('iframe')).toBeNull();
  });
});
