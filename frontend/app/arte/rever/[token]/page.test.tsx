import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import ArtReviewPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'test-review' }) }));
const art = {
  reference: 'MP-0001-2026', version: 1, file_name: 'frente.pdf', file_url: '/api/art-review/test-review/file/',
  mime_type: 'application/pdf', designer_comment: 'Conferir frente e verso', client_decision: 'pending', current: true,
  files: [
    { id: 0, name: 'frente.pdf', mime_type: 'application/pdf', url: '/api/art-review/test-review/file/' },
    { id: 5, name: 'verso.pdf', mime_type: 'application/pdf', url: '/api/art-review/test-review/file/?attachment=5' },
  ],
};

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:art-preview');
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (path: string) => path.includes('/file/')
    ? { ok: true, blob: async () => new Blob(['%PDF-test'], { type: 'application/pdf' }) }
    : { ok: true, json: async () => art }));
});
afterEach(() => vi.unstubAllGlobals());

it('shows a renewal request instead of artwork for an expired link', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'link_expired' }) } as Response);
  render(<ArtReviewPage />);
  const button = await screen.findByRole('button', { name: 'Pedir novo link' });
  expect(screen.queryByTitle('Arte v1')).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ detail: 'Pedido enviado.' }) } as Response);
  fireEvent.click(button);
  expect(await screen.findByText('Pedido enviado.')).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith('/api/art-review/test-review/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'request_link' }) }));
});

it('lets the client switch files while keeping approval scoped to the entire version', async () => {
  render(<ArtReviewPage />);
  await screen.findByTitle('Arte v1');
  fireEvent.change(screen.getByLabelText('O seu nome'), { target: { value: 'Cliente' } });
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button', { name: 'Aprovar esta versão' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '2. verso.pdf' }));
  await screen.findByTitle('Arte v1');
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(art.files[1].url, expect.objectContaining({ referrerPolicy: 'no-referrer' })));
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Aprovar esta versão' })).toBeDisabled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:art-preview');
});
