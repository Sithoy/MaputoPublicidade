import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBlobWithAuth } from '@/lib/auth';
import { WhatsAppAttachment } from './WhatsAppAttachment';

vi.mock('@/lib/auth', () => ({ fetchBlobWithAuth: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:private');
  URL.revokeObjectURL = vi.fn();
});
const file = { name: 'Referência.png', mime_type: 'image/png', previewable: true };
describe('WhatsApp attachments', () => {
  it('only fetches on click, renders privately and releases the object URL', async () => {
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    render(<WhatsAppAttachment conversationId={7} messageId={9} file={file} />);
    expect(fetchBlobWithAuth).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar Referência.png' }));
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:private');
    expect(fetchBlobWithAuth).toHaveBeenCalledWith('/api/support-conversations/7/attachments/9/');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar anexo' }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private'));
  });
  it('sandboxes PDF and offers explicit download', async () => {
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    render(<WhatsAppAttachment conversationId={7} messageId={9} file={{ ...file, name: 'Briefing.pdf', mime_type: 'application/pdf' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar Briefing.pdf' }));
    expect(await screen.findByTitle('Documento Briefing.pdf')).toHaveAttribute('sandbox', '');
    expect(screen.getByRole('link', { name: 'Descarregar anexo' })).toHaveAttribute('download', 'Briefing.pdf');
  });
  it('does not render unexpected HTML and allows a manual retry', async () => {
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['html'], { type: 'text/html' }));
    render(<WhatsAppAttachment conversationId={7} messageId={9} file={file} />);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar Referência.png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('img')).toBeInTheDocument();
  });
  it('does not fetch unsupported formats', () => {
    render(<WhatsAppAttachment conversationId={7} messageId={9} file={{ ...file, previewable: false }} />);
    expect(screen.getByText(/Formato ainda não disponível/)).toBeInTheDocument();
    expect(fetchBlobWithAuth).not.toHaveBeenCalled();
  });
});
