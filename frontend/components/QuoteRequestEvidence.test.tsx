import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewRequestAttachment, downloadRequestAttachment } from '@/lib/client-api';
import type { Quote } from '@/lib/api';
import { QuoteRequestEvidence } from './QuoteRequestEvidence';

vi.mock('@/lib/client-api', () => ({ previewRequestAttachment: vi.fn(), downloadRequestAttachment: vi.fn() }));
const revoke = vi.fn();
const quote = { reference: 'MP-0001-2026', request_attachments: [
  { id: 1, name: 'logo.png', size: 100 }, { id: 2, name: 'cartaz.JPG', size: 200 },
  { id: 3, name: 'lista.xlsx', size: 300 },
] } as Quote;

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:private-image'), revokeObjectURL: revoke }));
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.mocked(previewRequestAttachment).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('QuoteRequestEvidence previews', () => {
  it('opens private images without download, zooms, navigates and cleans up', async () => {
    render(<QuoteRequestEvidence quote={quote} />);
    const opener = screen.getByRole('button', { name: 'Visualizar logo.png' });
    expect(screen.queryByRole('button', { name: 'Visualizar lista.xlsx' })).not.toBeInTheDocument();
    fireEvent.click(opener);
    expect(await screen.findByRole('img', { name: 'logo.png' })).toHaveAttribute('src', 'blob:private-image');
    expect(downloadRequestAttachment).not.toHaveBeenCalled();
    expect(previewRequestAttachment).toHaveBeenCalledWith('MP-0001-2026', 1, expect.any(AbortSignal), 'quotes');
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar zoom' }));
    expect(screen.getByText('150%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Imagem seguinte' }));
    expect(await screen.findByRole('img', { name: 'cartaz.JPG' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(revoke).toHaveBeenCalledWith('blob:private-image');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('handles failed previews and retries without downloading', async () => {
    vi.mocked(previewRequestAttachment).mockRejectedValueOnce(new Error('Forbidden'));
    render(<QuoteRequestEvidence quote={quote} />);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar logo.png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('img', { name: 'logo.png' })).toBeInTheDocument();
    expect(downloadRequestAttachment).not.toHaveBeenCalled();
  });

  it('aborts requests when closed and does not create a late blob URL', async () => {
    let finish!: (value: Blob) => void;
    vi.mocked(previewRequestAttachment).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<QuoteRequestEvidence quote={quote} />);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar logo.png' }));
    const signal = vi.mocked(previewRequestAttachment).mock.calls[0][2]!;
    fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização' }));
    expect(signal.aborted).toBe(true);
    finish(new Blob(['png'], { type: 'image/png' }));
    await waitFor(() => expect(URL.createObjectURL).not.toHaveBeenCalled());
  });
});
