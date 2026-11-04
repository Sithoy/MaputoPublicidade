import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ClientArtReview } from './ClientArtReview';
import { approveArtwork, requestArtworkChange } from '@/lib/client-api';
import type { Quote, ProofVersion } from '@/lib/api';
const quote = { reference: 'MP-0001-2026', status: 'approved' } as Quote;
const proof: ProofVersion = { id: 10, version: 2, file: '', published_at: '2026-11-04', created_at: '2026-11-04', client_decision: 'pending', files: [{ id: 1, name: 'frente.pdf', url: '/api/artwork-files/10/', mime_type: 'application/pdf' }, { id: 2, name: 'verso.png', url: '/api/artwork-files/10/?attachment=2', mime_type: 'image/png' }] };
vi.mock('@/lib/client-api', () => ({ approveArtwork: vi.fn(), requestArtworkChange: vi.fn() }));
vi.mock('./PrivateArtPreview', () => ({ PrivateArtPreview: ({ label }: { label: string }) => <button>{label}</button> }));
vi.mock('./ProofVersionHistory', () => ({ ProofVersionHistory: () => null }));
beforeEach(() => { vi.clearAllMocks(); });
it('shows every published file, but never approves merely by opening the review', () => {
  render(<ClientArtReview quote={quote} proof={proof} onChanged={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Ver frente.pdf' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ver verso.png' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Aprovar esta versão' })).toBeDisabled();
  expect(approveArtwork).not.toHaveBeenCalled();
});
it('records the displayed version through the existing authenticated approval endpoint', async () => {
  const changed = vi.fn();
  render(<ClientArtReview quote={quote} proof={proof} onChanged={changed} />);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Aprovar esta versão' }));
  await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(approveArtwork).toHaveBeenCalledWith(quote.reference, '', 10);
});
it('requires a reason and a fresh confirmation after editing a change request', async () => {
  render(<ClientArtReview quote={quote} proof={proof} onChanged={vi.fn()} />);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button', { name: 'Pedir alterações' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Aumentar o logótipo' } });
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Pedir alterações' }));
  await waitFor(() => expect(requestArtworkChange).toHaveBeenCalledWith(quote.reference, 'Aumentar o logótipo', 10));
});
it('shows existing link decisions without offering a second approval', () => {
  render(<ClientArtReview quote={quote} proof={{ ...proof, client_decision: 'approved', client_comment: 'Conforme solicitado' }} onChanged={vi.fn()} />);
  expect(screen.getByRole('status')).toHaveTextContent('Arte aprovada. Conforme solicitado');
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
it('keeps a failed or stale decision unconfirmed rather than presenting it as accepted', async () => {
  vi.mocked(approveArtwork).mockRejectedValueOnce(new Error('A versão mudou'));
  const changed = vi.fn();
  render(<ClientArtReview quote={quote} proof={proof} onChanged={changed} />);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Aprovar esta versão' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('A versão mudou');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(changed).not.toHaveBeenCalled();
});
