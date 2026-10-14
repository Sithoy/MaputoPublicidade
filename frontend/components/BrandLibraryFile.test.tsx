import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrandLibraryFileLink, BrandLibraryThumbnail, isBrandImage } from './BrandLibraryFile';
import { downloadWithAuth, fetchBlobWithAuth } from '@/lib/auth';
vi.mock('@/lib/auth', () => ({ downloadWithAuth: vi.fn(), fetchBlobWithAuth: vi.fn() }));

describe('Private brand library files', () => {
  beforeEach(() => { vi.clearAllMocks(); URL.createObjectURL = vi.fn(() => 'blob:private-preview'); URL.revokeObjectURL = vi.fn(); });
  it('recognizes metadata and signed image URLs', () => {
    expect(isBrandImage('/api/brand-assets/12/file/', 'image/png')).toBe(true);
    expect(isBrandImage('https://storage.example/logo.png?signature=test')).toBe(true);
    expect(isBrandImage('/api/brand-assets/12/file/', '', 'logo.svg')).toBe(true);
    expect(isBrandImage('/api/brand-assets/12/file/', 'application/pdf')).toBe(false);
  });
  it('fetches authorized bytes rather than putting a token in the image URL', async () => {
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    const { unmount } = render(<BrandLibraryThumbnail url="/api/brand-assets/12/file/" name="Logo" />);
    expect(await screen.findByRole('img', { name: 'Logo' })).toHaveAttribute('src', 'blob:private-preview');
    expect(fetchBlobWithAuth).toHaveBeenCalledWith('/api/brand-assets/12/file/', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-preview');
  });
  it('shows a clear failed-preview state and supports retry', async () => {
    vi.mocked(fetchBlobWithAuth).mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce(new Blob(['image'], { type: 'image/webp' }));
    render(<BrandLibraryThumbnail url="/api/brand-assets/12/file/" name="Logo" />);
    await screen.findByText('Pré-visualização indisponível');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('img', { name: 'Logo' });
  });
  it('downloads protected art and brand files with authentication', async () => {
    vi.mocked(downloadWithAuth).mockResolvedValue(undefined);
    render(<BrandLibraryFileLink url="/api/artwork-files/12/" filename="arte.png">Descarregar</BrandLibraryFileLink>);
    fireEvent.click(screen.getByRole('button', { name: 'Descarregar' }));
    await waitFor(() => expect(downloadWithAuth).toHaveBeenCalledWith('/api/artwork-files/12/', 'arte.png'));
  });
  it('does not send authentication to external public image hosts', () => {
    render(<BrandLibraryFileLink url="https://storage.example/logo.png" filename="logo.png">Descarregar</BrandLibraryFileLink>);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://storage.example/logo.png');
    expect(downloadWithAuth).not.toHaveBeenCalled();
  });
});
