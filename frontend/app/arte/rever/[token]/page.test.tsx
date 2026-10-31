import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import ArtReviewPage from './page';

let routeToken = 'test-review';
vi.mock('next/navigation', () => ({ useParams: () => ({ token: routeToken }) }));
const art = {
  reference: 'MP-0001-2026', version: 1, file_name: 'frente.pdf', file_url: '/api/art-review/test-review/file/',
  mime_type: 'application/pdf', designer_comment: 'Conferir frente e verso', client_decision: 'pending', current: true,
  files: [
    { id: 0, name: 'frente.pdf', mime_type: 'application/pdf', url: '/api/art-review/test-review/file/' },
    { id: 5, name: 'verso.pdf', mime_type: 'application/pdf', url: '/api/art-review/test-review/file/?attachment=5' },
  ],
};

beforeEach(() => {
  routeToken = 'test-review';
  URL.createObjectURL = vi.fn(() => 'blob:art-preview');
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (path: string) => path.includes('/file/')
    ? { ok: true, blob: async () => new Blob(['%PDF-test'], { type: 'application/pdf' }) }
    : { ok: true, json: async () => art }));
});
afterEach(() => vi.unstubAllGlobals());

it('normalizes escaped route tokens for loading and decisions', async () => {
  routeToken = 'eyJpZCI6Mn0%3A1xTEST%3Aabc_DEF-123';
  const endpoint = `/api/art-review/${routeToken}/`;
  render(<ArtReviewPage />);
  await screen.findByTitle('Arte v1');
  expect(fetch).toHaveBeenCalledWith(endpoint, expect.objectContaining({ cache: 'no-store' }));
  fireEvent.change(screen.getByLabelText('O seu nome'), { target: { value: 'Cliente' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Aprovar esta versão' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(endpoint, expect.objectContaining({ method: 'POST', body: JSON.stringify({ decision: 'approved', name: 'Cliente', comment: '' }) })));
  expect(vi.mocked(fetch).mock.calls.every(([path]) => !String(path).includes('%253A'))).toBe(true);
});

it('uses the normalized endpoint when requesting a replacement link', async () => {
  routeToken = 'eyJpZCI6Mn0%3A1xTEST%3Aabc_DEF-123';
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'link_expired' }) } as Response);
  render(<ArtReviewPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Pedir novo link' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(`/api/art-review/${routeToken}/`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'request_link' }) })));
});

it('rejects malformed route tokens without requesting artwork', async () => {
  routeToken = '%253A';
  render(<ArtReviewPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('formato inválido');
  expect(fetch).not.toHaveBeenCalled();
});

it.each([429, 503])('does not mislabel a temporary HTTP %s failure as an expired link', async (status) => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status, json: async () => ({}) } as Response);
  render(<ArtReviewPage />);
  const alert = await screen.findByRole('alert');
  expect(alert).not.toHaveTextContent('substituído ou revogado');
  expect(screen.queryByRole('button', { name: 'Pedir novo link' })).not.toBeInTheDocument();
});

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

it.each([
  ['link_expired', 'ART-LINK-EXPIRED'],
  ['link_invalid', 'ART-LINK-INVALID'],
  ['link_replaced', 'ART-LINK-REPLACED'],
  ['link_revoked', 'ART-LINK-REVOKED'],
  ['link_outdated', 'ART-VERSION-OUTDATED'],
])('shows a specific diagnostic for %s without offering unauthorized renewal', async (code, diagnostic) => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: code === 'link_expired' ? 410 : 404, json: async () => ({ code, can_request_link: false }) } as Response);
  render(<ArtReviewPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent(diagnostic);
  expect(screen.queryByRole('button', { name: 'Pedir novo link' })).not.toBeInTheDocument();
  expect(screen.queryByTitle('Arte v1')).not.toBeInTheDocument();
});

it('identifies a failed connection without claiming the link has expired', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
  render(<ArtReviewPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('ART-CONNECTION');
  expect(screen.queryByRole('button', { name: 'Pedir novo link' })).not.toBeInTheDocument();
});

it('distinguishes an unavailable file from an invalid review link', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => art } as Response)
    .mockResolvedValueOnce({ ok: false, status: 404 } as Response);
  render(<ArtReviewPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('ART-FILE-UNAVAILABLE');
  expect(screen.getByRole('button', { name: 'Aprovar esta versão' })).toBeDisabled();
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
