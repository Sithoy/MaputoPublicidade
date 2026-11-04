'use client';

import { useState } from 'react';
import type { Quote, ProofVersion } from '@/lib/api';
import { approveArtwork, requestArtworkChange } from '@/lib/client-api';
import { PrivateArtPreview } from './PrivateArtPreview';
import { ProofVersionHistory } from './ProofVersionHistory';
import { APPROVAL_CHANGED } from '@/lib/branddesk-review';

/** Keyed by version/decision in the parent so confirmation never survives a revision. */
export function ClientArtReview({ quote, proof, onChanged }: { quote: Quote; proof: ProofVersion; onChanged: () => Promise<void> }) {
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closed = quote.status === 'cancelled' || quote.status === 'delivered' || quote.journey?.cancelled;
  const pending = proof.client_decision === 'pending' && !closed;
  async function decide(accept: boolean) {
    if (busy || !pending || !confirmed || (!accept && !comment.trim())) return;
    setBusy(true); setError('');
    try {
      if (accept) await approveArtwork(quote.reference, comment, proof.id);
      else await requestArtworkChange(quote.reference, comment, proof.id);
      setConfirmed(false);
      window.dispatchEvent(new Event(APPROVAL_CHANGED));
      await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível registar a decisão. Atualize a arte antes de tentar novamente.'); setConfirmed(false); }
    finally { setBusy(false); }
  }
  return <section id="arte" aria-label="Aprovação da arte" className="scroll-mt-24 space-y-5 rounded-2xl border bg-white p-5 sm:p-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{quote.reference} · Arte v{proof.version}</p><h2 className="mt-2 text-xl font-semibold text-brand-900">Confirme a arte do seu trabalho</h2><p className="mt-2 text-sm text-slate-500">A mesma versão enviada por email ou WhatsApp. Esta decisão aprova apenas a arte, não preços nem pagamentos.</p></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {proof.designer_comment ? <p className="whitespace-pre-wrap text-sm">{proof.designer_comment}</p> : null}
    <section aria-label="Ficheiros para aprovação" className="space-y-3">{proof.files?.length ? proof.files.map((file) => <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><p className="min-w-0 text-sm [overflow-wrap:anywhere]">{file.name}</p><PrivateArtPreview url={file.url} label={`Ver ${file.name}`} /></div>) : proof.file ? <PrivateArtPreview url={proof.file} label="Ver arte desta versão" /> : <p className="text-sm">Ficheiro indisponível. Contacte a Recepção antes de responder.</p>}</section>
    {pending ? <fieldset disabled={busy} className="space-y-4"><legend className="sr-only">Decisão da arte v{proof.version}</legend>
      <label className="block text-sm font-medium">Comentário ou alterações pretendidas<textarea value={comment} onChange={(event) => { setComment(event.target.value); setConfirmed(false); }} maxLength={3000} rows={3} className="mt-2 block w-full rounded-xl border p-3" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />Consultei todos os ficheiros da versão {proof.version} e tenho autorização para responder pelo cliente.</label>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={!confirmed || (!proof.files?.length && !proof.file)} onClick={() => void decide(true)} className="rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Aprovar esta versão</button><button type="button" disabled={!confirmed || !comment.trim() || (!proof.files?.length && !proof.file)} onClick={() => void decide(false)} className="rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-50">Pedir alterações</button></div>
      <p className="text-xs text-slate-500">A decisão fica associada à sua conta BrandDesk e é refletida na Recepção e nos links enviados pela MP.</p>
    </fieldset> : <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm">{proof.client_decision === 'approved' ? 'Arte aprovada.' : proof.client_decision === 'changes_requested' ? 'Alterações solicitadas.' : 'Este trabalho já não aceita decisões de arte.'} {proof.client_comment}</p>}
    <ProofVersionHistory versions={quote.proof_versions || []} canSaveToLibrary />
  </section>;
}
