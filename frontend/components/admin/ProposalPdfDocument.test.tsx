import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminQuote } from '@/lib/admin-api';
import { fetchBlobWithAuth } from '@/lib/auth';
import { ProposalPdfDocument } from './ProposalPdfDocument';

vi.mock('@/lib/auth', () => ({ fetchBlobWithAuth: vi.fn() }));
const quote = { reference: 'MP-0001-2026' } as AdminQuote;
const pdf = new Blob(['%PDF-test'], { type: 'application/pdf' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchBlobWithAuth).mockResolvedValue(pdf);
  URL.createObjectURL = vi.fn(() => 'blob:proposal');
  URL.revokeObjectURL = vi.fn();
});

describe('Canonical proposal preview', () => {
  it('fetches authenticated PDF bytes, displays them inline and releases them on close', async () => {
    const view = render(<ProposalPdfDocument quote={quote} />);
    expect(screen.getByRole('status')).toHaveTextContent('A preparar');
    expect(await screen.findByTitle('Proposta MP-0001-2026 — documento completo')).toHaveAttribute('src', 'blob:proposal');
    expect(fetchBlobWithAuth).toHaveBeenCalledWith('/api/quotes/MP-0001-2026/pdf/', { signal: expect.any(AbortSignal) });
    const link = screen.getByRole('link', { name: 'Abrir PDF noutro separador' });
    expect(link).toHaveAttribute('href', 'blob:proposal');
    expect(link).not.toHaveAttribute('download');
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:proposal');
    expect(vi.mocked(fetchBlobWithAuth).mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('offers a retry on failure rather than silently falling back to an outdated template', async () => {
    vi.mocked(fetchBlobWithAuth).mockRejectedValueOnce(new Error('Unavailable'));
    render(<ProposalPdfDocument quote={quote} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByTitle('Proposta MP-0001-2026 — documento completo')).toBeInTheDocument();
    expect(fetchBlobWithAuth).toHaveBeenCalledTimes(2);
  });

  it('does not leak a URL when a request completes after the preview closes', async () => {
    let finish!: (value: Blob) => void;
    vi.mocked(fetchBlobWithAuth).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = render(<ProposalPdfDocument quote={quote} />);
    view.unmount();
    finish(pdf);
    await waitFor(() => expect(vi.mocked(fetchBlobWithAuth).mock.calls[0][1]?.signal?.aborted).toBe(true));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('reloads the canonical document when a different saved quote arrives', async () => {
    const view = render(<ProposalPdfDocument quote={quote} />);
    await screen.findByTitle('Proposta MP-0001-2026 — documento completo');
    view.rerender(<ProposalPdfDocument quote={{ ...quote, reference: 'MP-0002-2026' }} />);
    expect(screen.queryByTitle('Proposta MP-0001-2026 — documento completo')).not.toBeInTheDocument();
    expect(await screen.findByTitle('Proposta MP-0002-2026 — documento completo')).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:proposal');
  });
});
