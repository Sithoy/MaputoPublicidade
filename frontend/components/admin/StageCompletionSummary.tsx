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
import { MaterialBriefingSummary } from '@/components/MaterialBriefingSummary';
import { formatMZN } from '@/lib/utils';

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
        <p className="mt-2 text-xs text-slate-500">Último registo da etapa · Horas de Maputo. Histórico completo em Registos.</p></div>
    </header>
    {!skipped ? <div className="space-y-6 p-5 sm:p-6">
      {orderReference && allowed && !data ? <p role="status" className="text-sm">A consultar o registo operacional…</p> : null}
      {data?.failed ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Não foi possível consultar os registos operacionais. <button type="button" className="font-semibold underline" onClick={() => { setLoaded(null); setRetry((value) => value + 1); }}>Tentar novamente</button></p> : null}
      {orderReference && !allowed ? <p className="text-sm text-slate-500">A sua função não permite consultar os registos da encomenda.</p> : null}
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{record.facts.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className={`mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere] ${value ? 'font-medium text-brand-900' : 'text-slate-400'}`}>{recorded(value)}</dd></div>)}</dl>
      {step === 0 ? <section aria-label="Resumo do briefing" className="space-y-4 border-t pt-5"><h4 className="text-sm font-semibold text-brand-900">Briefing e materiais atuais</h4><p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{quote.reception?.briefing?.description || quote.notes || 'Descrição não registada'}</p><QuoteRequestEvidence quote={quote} /></section> : null}
      {step === 1 ? <section aria-label="Resumo da proposta" className="space-y-5 border-t pt-5">
        <h4 className="text-sm font-semibold text-brand-900">Proposta atual · v{quote.proposal_workflow?.version || '—'}</h4>
        {quote.items.length ? <ul className="divide-y text-sm">{quote.items.map((item) => <li key={item.id} className="flex gap-4 py-3"><span className="shrink-0 font-semibold tabular-nums">{item.quantity} ×</span><div className="min-w-0 [overflow-wrap:anywhere]"><p className="whitespace-pre-wrap">{item.description}</p><MaterialBriefingSummary value={item.material_briefing} notes={item.notes} /></div></li>)}</ul> : <p className="text-sm text-slate-500">Sem itens registados.</p>}
        <dl className="grid gap-5 rounded-xl bg-[#f6f7f1] p-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Total da proposta</dt><dd className="mt-1 font-semibold text-brand-900">{quote.final_price == null ? 'Não registado' : formatMZN(quote.final_price)}</dd></div>
          <div><dt className="text-xs text-slate-500">Entrega estimada</dt><dd className="mt-1">{quote.estimated_delivery_days == null ? 'Não registado' : `${quote.estimated_delivery_days} dias úteis`}</dd></div>
          <div><dt className="text-xs text-slate-500">Pagamento</dt><dd className="mt-1">{quote.payment_option_display || (quote.payment_option === 'deposit_50' ? '50% adiantado + 50% na entrega' : quote.payment_option === 'on_delivery' ? '100% na entrega' : 'Não registado')}</dd></div>
        </dl>
        <div><h4 className="text-sm font-semibold text-brand-900">Condições complementares</h4><p className="mt-2 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{quote.terms || 'Sem condições complementares registadas.'}</p></div>
      </section> : null}
      {(step === 3 || step === 4) && proof ? <section><h4 className="text-sm font-semibold text-brand-900">Materiais publicados · v{proof.version}</h4><div className="mt-3 flex flex-wrap gap-3">{proof.files?.length ? proof.files.map((file) => <PrivateArtPreview key={file.id} url={file.url} label={`Ver ${file.name}`} />) : proof.file ? <PrivateArtPreview url={proof.file} label="Ver arte" /> : null}</div></section> : null}
    </div> : null}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-[#fafaf6] p-5"><p className="text-sm text-brand-900">Etapa atual: <strong>{quote.journey?.label || 'Consultar percurso do pedido'}</strong></p><button type="button" onClick={onCurrent} className="rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white">Voltar à etapa atual →</button></footer>
  </section>;
}
