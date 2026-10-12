'use client';

import { useState } from 'react';
import type { AdminQuote } from '@/lib/admin-api';
import { fetchWithAuth } from '@/lib/auth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { formatMZN } from '@/lib/utils';

function RevisionConditions({ snapshot }: { snapshot: Record<string, unknown> }) {
  const fields = { client_name: 'Cliente', client_nuit: 'NUIT', final_price: 'Total (MZN)', discount_amount: 'Desconto fixo (MZN)', discount_percentage: 'Desconto (%)', tax_rate: 'IVA (%)', estimated_delivery_days: 'Entrega estimada (dias)', valid_until: 'Validade', payment_option: 'Pagamento', billing_address: 'Endereço', terms: 'Condições', notes: 'Observações' };
  const items = Array.isArray(snapshot.items) ? snapshot.items.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];
  return <div className="mt-3 space-y-4 text-xs"><dl className="grid gap-3 sm:grid-cols-2">{Object.entries(fields).map(([key, label]) => <div key={key}><dt className="font-semibold text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words">{key === 'payment_option' ? snapshot[key] === 'on_delivery' ? '100% na entrega' : '50% adiantado + 50% na entrega' : String(snapshot[key] ?? '—')}</dd></div>)}</dl><div className="overflow-x-auto"><table className="w-full text-left"><caption className="mb-2 text-left font-semibold">Artigos desta versão</caption><thead><tr><th className="p-2">Descrição</th><th className="p-2">Quantidade</th><th className="p-2">Preço unitário (MZN)</th></tr></thead><tbody>{items.map((item, index) => <tr key={index} className="border-t"><td className="p-2">{String(item.description ?? '')}</td><td className="p-2">{String(item.quantity ?? '—')}</td><td className="p-2">{String(item.unit_price ?? '—')}</td></tr>)}</tbody></table></div></div>;
}

export function ProposalWorkflowCard({ quote, onChange }: { quote: AdminQuote; onChange: (quote: AdminQuote) => void }) {
  const { can } = useAdminAuth();
  const workflow = quote.proposal_workflow;
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!workflow || workflow.stage === 'legacy') return null;
  async function act(action: 'submit' | 'approve' | 'return' | 'send') {
    if (busy || !workflow) return;
    if (action === 'send' && !window.confirm('Disponibilizar esta versão aprovada no BrandDesk e registar o envio? Para clientes sem conta, confirme o envio do PDF pelo canal acordado.')) return;
    setBusy(true); setError('');
    try {
      const updated: AdminQuote = await fetchWithAuth(`/api/quotes/${quote.reference}/proposal-workflow/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, version: workflow.version, comment }) });
      onChange(updated); setComment('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir. Atualize a proposta.'); }
    finally { setBusy(false); }
  }
  const closed = Boolean(quote.price_approved_at || quote.order_reference || quote.status === 'cancelled');
  return <section className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Receção prepara · Comercial aprova · Receção envia</p><h2 className="mt-2 text-lg font-semibold">{workflow.stage_display} · {workflow.stage === 'draft' ? `Rascunho para v${workflow.version + 1}` : `v${workflow.version}`}</h2></div><span className="text-sm font-medium">{quote.final_price == null ? 'Preço por definir' : formatMZN(quote.final_price)}</span></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Preparação</dt><dd>{workflow.prepared_by || 'Por atribuir'}</dd></div><div><dt className="text-slate-500">Revisão interna</dt><dd>{workflow.reviewed_by || 'Pendente'}</dd></div><div><dt className="text-slate-500">Decisão do cliente</dt><dd>{quote.price_approved_at ? 'Aceite pelo cliente' : 'Ainda não aceite'}</dd></div>
      <div><dt className="text-slate-500">Pagamento</dt><dd>{quote.payment_option_display || (quote.payment_option === 'on_delivery' ? '100% na entrega' : '50% adiantado + 50% na entrega')}</dd></div><div><dt className="text-slate-500">Entrega estimada</dt><dd>{quote.estimated_delivery_days == null ? 'Por definir' : `${quote.estimated_delivery_days} dias`}</dd></div><div><dt className="text-slate-500">Desconto</dt><dd>{quote.discount_type === 'percentage' ? `${quote.discount_percentage || 0}%` : formatMZN(quote.discount_amount || 0)}</dd></div>
    </dl>
    {workflow.comment ? <p className="rounded-xl bg-white p-3 text-sm whitespace-pre-wrap">Observação do Comercial: {workflow.comment}</p> : null}
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
    {!closed ? <fieldset disabled={busy} className="space-y-3"><label className="block text-sm">Observações da submissão / revisão<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={3000} rows={2} className="mt-1 w-full rounded-xl border p-3" /></label><div className="flex flex-wrap gap-3">
      {can('quotes.manage') && ['draft', 'returned'].includes(workflow.stage) ? <button type="button" disabled={quote.final_price == null} onClick={() => act('submit')} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Submeter proposta para aprovação</button> : null}
      {can('quotes.review') && workflow.stage === 'review' ? <><button type="button" disabled={!workflow.can_review} onClick={() => act('approve')} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Aprovar internamente</button><button type="button" disabled={!workflow.can_review || !comment.trim()} onClick={() => act('return')} className="rounded-xl border bg-white px-4 py-3 text-sm disabled:opacity-50">Devolver para ajustes</button></> : null}
      {can('quotes.manage') && workflow.stage === 'approved' ? <button type="button" onClick={() => act('send')} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Disponibilizar / registar envio ao cliente</button> : null}
    </div>{workflow.stage === 'review' && !workflow.can_review ? <p className="text-xs text-slate-600">Quem participou na preparação não pode aprovar esta versão. Aguarde outro Comercial / administrador.</p> : null}</fieldset> : null}
    <p className="text-xs text-slate-600">Alterações nos artigos, valores ou condições retiram a aprovação interna. PDFs de versões não enviadas destinam-se apenas à revisão interna. O envio externo por WhatsApp/email não é automático.</p>
    {workflow.history.length ? <details className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">Histórico e versões da proposta</summary><ol className="mt-3 space-y-3">{workflow.history.map((event, index) => <li key={`${event.at}:${index}`} className="text-xs"><p className="font-semibold">v{event.version} · {event.action} · {event.actor}</p><p>{new Date(event.at).toLocaleString('pt-MZ')}</p>{event.comment ? <p className="whitespace-pre-wrap">{event.comment}</p> : null}{event.snapshot ? <details className="mt-1"><summary>Consultar condições desta versão</summary><RevisionConditions snapshot={event.snapshot} /></details> : null}</li>)}</ol></details> : null}
  </section>;
}
