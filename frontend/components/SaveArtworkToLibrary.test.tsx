import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveApprovedArtwork } from '@/lib/client-api';
import { SaveArtworkToLibrary } from './SaveArtworkToLibrary';

vi.mock('@/lib/client-api', () => ({ saveApprovedArtwork: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true); });
describe('Archive approved artwork', () => {
  it('requires confirmation and saves the exact version', async () => {
    vi.mocked(saveApprovedArtwork).mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof saveApprovedArtwork>>);
    render(<SaveArtworkToLibrary versionId={13} />);
    fireEvent.click(screen.getByRole('button'));
    expect(window.confirm).toHaveBeenCalled();
    expect(saveApprovedArtwork).toHaveBeenCalledWith(13);
    expect(await screen.findByRole('status')).toHaveTextContent('guardada');
  });
  it('shows the server refusal for outdated artwork without claiming success', async () => {
    vi.mocked(saveApprovedArtwork).mockRejectedValue(new Error('Prepare a versão atual.'));
    render(<SaveArtworkToLibrary versionId={13} showLibraryLink={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent('versão atual');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
