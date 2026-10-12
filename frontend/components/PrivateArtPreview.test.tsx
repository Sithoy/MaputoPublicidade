import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBlobWithAuth } from '@/lib/auth';
import { PrivateArtPreview } from './PrivateArtPreview';

vi.mock('@/lib/auth', () => ({ fetchBlobWithAuth: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); URL.createObjectURL = vi.fn(() => 'blob:private-art'); URL.revokeObjectURL = vi.fn(); });
describe('Private art preview', () => {
  it('fetches with authentication only on click and clears the PDF blob when closed', async () => {
    vi.mocked(fetchBlobWithAuth).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    render(<PrivateArtPreview url="/api/artwork-files/9/" />);
    expect(fetchBlobWithAuth).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver ficheiro' }));
    expect(await screen.findByTitle('Prova de arte')).toHaveAttribute('sandbox', '');
    expect(fetchBlobWithAuth).toHaveBeenCalledWith('/api/artwork-files/9/');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar arte' }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-art'));
  });
});
