'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getOrder, type AdminQuote } from '@/lib/admin-api';
import type { Order } from '@/lib/api';
import { stageRecord } from '@/lib/stage-record';
import { workflowStages } from '@/lib/workflow';
import { PrivateArtPreview } from '@/components/PrivateArtPreview';
import { QuoteRequestEvidence } from '@/components/QuoteRequestEvidence';

function recorded(value?: string | null) {
  if (!value) return 'Não registado';
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value) && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo', dateStyle: 'medium', timeStyle: 'short' });
  }
  return value;
}

export function StageCompletionSummary({ quote, step, onCurrent }: { quote: AdminQuote; step: number; onCurrent: () => void }) {
  const { can } = useAdminAuth();
  const allowed = can('orders.view');
  const orderReference = step >= 5 ? quote.order_reference : null;
  const [loaded, setLoaded] = useState<{ reference: string; order?: Order; failed?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!orderReference || !allowed) return;
    let active = true;
    getOrder(orderReference).then((order) => { if (active) setLoaded({ reference: orderReference, order }); })
      .catch(() => { if (active) setLoaded({ reference: orderReference, failed: true }); });
    return () => { active = false; };
  }, [orderReference, allowed, retry]);
  const data = allowed && loaded?.reference === orderReference ? loaded : null;
  const skipped = Boolean(quote.journey?.steps[step]?.skipped);
  const record = stageRecord(quote, step, data?.order);
  const proof = quote.proof_versions?.filter((row) => row.published_at).toSorted((a, b) => b.version - a.version)[0];
  return <section aria-label="Registo da etapa" className="overflow-hidden rounded-2xl border border-[#dbe4d5] bg-white">
    <header className="flex items-start gap-3 border-b border-[#dbe4d5] bg-[#f3f6ee] p-5 sm:p-6">
      <CheckCircle2 aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-brand-700" />
      <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-700">{workflowStages[step]?.shortLabel} · {skipped ? 'Não necessária' : 'Etapa concluída'}</p>
        <h3 className="mt-2 text-xl font-semibold text-brand-900">{skipped ? 'Este trabalho não requer esta etapa' : record.outcome}</h3>
        <p className="mt-2 text-xs text-slate-500">Registo de execução · Horas de Maputo. A autoria refere-se à ação registada, não a toda a execução do trabalho.</p></div>
    </header>
    {!skipped ? <div className="space-y-6 p-5 sm:p-6">
      {orderReference && allowed && !data ? <p role="status" className="text-sm">A consultar o registo operacional…</p> : null}
      {data?.failed ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Não foi possível consultar os registos operacionais. <button type="button" className="font-semibold underline" onClick={() => { setLoaded(null); setRetry((value) => value + 1); }}>Tentar novamente</button></p> : null}
      {orderReference && !allowed ? <p className="text-sm text-slate-500">A sua função não permite consultar os registos da encomenda.</p> : null}
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{record.facts.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className={`mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere] ${value ? 'font-medium text-brand-900' : 'text-slate-400'}`}>{recorded(value)}</dd></div>)}</dl>
      {step === 0 ? <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold text-brand-900">Consultar briefing e materiais atuais</summary><p className="mt-4 whitespace-pre-wrap text-sm">{quote.reception?.briefing?.description || quote.notes || 'Descrição não registada'}</p><QuoteRequestEvidence quote={quote} /></details> : null}
      {step === 1 ? <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold text-brand-900">Consultar itens da proposta atual · v{quote.proposal_workflow?.version || '—'}</summary><ul className="mt-4 divide-y text-sm">{quote.items.map((item) => <li key={item.id} className="flex gap-4 py-3"><span className="shrink-0 font-semibold tabular-nums">{item.quantity} ×</span><span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{item.description}</span></li>)}</ul></details> : null}
      {(step === 3 || step === 4) && proof ? <section><h4 className="text-sm font-semibold text-brand-900">Materiais publicados · v{proof.version}</h4><div className="mt-3 flex flex-wrap gap-3">{proof.files?.length ? proof.files.map((file) => <PrivateArtPreview key={file.id} url={file.url} label={`Ver ${file.name}`} />) : proof.file ? <PrivateArtPreview url={proof.file} label="Ver arte" /> : null}</div></section> : null}
      <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold text-brand-900">Histórico da etapa ({record.events.length})</summary>
        <p className="mt-3 text-xs text-slate-500">Inclui registos anteriores, mesmo após revisões. As versões identificam a proposta a que cada ação pertence.</p>
        {record.events.length ? <ol className="mt-4 space-y-4 border-l border-[#cfb66b] pl-4">{record.events.toSorted((a, b) => (b.at || '').localeCompare(a.at || '')).map((event, index) => <li key={`${event.at}:${index}`} className="text-sm"><p className="font-semibold text-brand-900">{event.action}{event.version ? ` · v${event.version}` : ''}</p><p className="mt-1 text-xs text-slate-500">{recorded(event.actor)} · {recorded(event.at)}</p>{event.comment ? <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{event.comment}</p> : null}</li>)}</ol> : <p className="mt-4 text-sm text-slate-500">Não há histórico detalhado registado para esta etapa.</p>}
      </details>
    </div> : null}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-[#fafaf6] p-5"><p className="text-sm text-brand-900">Etapa atual: <strong>{quote.journey?.label || 'Consultar percurso do pedido'}</strong></p><button type="button" onClick={onCurrent} className="rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white">Voltar à etapa atual →</button></footer>
  </section>;
}
