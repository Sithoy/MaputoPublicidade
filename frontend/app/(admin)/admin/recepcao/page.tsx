'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Headphones, Plus, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { getReceptionQueue, getReceptionSummary, type ReceptionRequest, type ReceptionSummary, type ReceptionPage as ReceptionQueuePage } from '@/lib/reception-api';
import { ReceptionRequestPanel } from '@/components/admin/ReceptionRequestPanel';

const sources: Record<string, string> = { walk_in: 'Presencial', phone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail', web: 'Website / BrandDesk' };

export default function ReceptionPage() {
  const { user, loading: authLoading, can } = useAdminAuth();
  const allowed = can('reception.manage');
  const [summary, setSummary] = useState<ReceptionSummary | null>(null);
  const [requests, setRequests] = useState<ReceptionRequest[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [scope, setScope] = useState('all');
  const [selected, setSelected] = useState<ReceptionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    if (authLoading || !allowed) return;
    let cancelled = false;
    generation.current += 1;
    setLoading(true); setError('');
    Promise.all([getReceptionSummary(), getReceptionQueue(scope)]).then(([stats, queue]) => {
      if (!cancelled) { setSummary(stats); setRequests(queue.results); setNext(queue.next); }
    }).catch(() => { if (!cancelled) setError('Não foi possível carregar a Recepção. Tente novamente.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, allowed, scope, revision]);

  async function more() {
    if (!next) return;
    setLoading(true); setError('');
    const currentGeneration = generation.current;
    try {
      const url = new URL(next, window.location.origin);
      const page: ReceptionQueuePage = await fetchWithAuth(url.pathname + url.search);
      if (currentGeneration === generation.current) { setRequests((rows) => [...rows, ...page.results].filter((row, index, all) => all.findIndex((item) => item.reference === row.reference) === index)); setNext(page.next); }
    } catch { setError('Não foi possível carregar mais pedidos.'); }
    finally { setLoading(false); }
  }

  function changed(reference: string, request: ReceptionRequest | null) {
    setSelected((current) => current?.reference === reference ? request : current);
    if (!request) setNotice('Pedido encaminhado ao Comercial, sem duplicações.');
    setRevision((value) => value + 1);
  }

  if (authLoading || !allowed) return <p>A carregar a Recepção…</p>;
  return <div className="space-y-6">
    <section className="rounded-3xl bg-brand-900 p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">Espaço operacional · Recepção</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-3xl font-semibold tracking-tight">Cada pedido começa com uma boa conversa.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Receba, confirme o que falta e entregue ao Comercial um pedido claro. O mesmo registo acompanha o cliente até à entrega.</p></div>
        <Link href="/admin/orcamentos/novo" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-900"><Plus className="h-4 w-4" />Novo atendimento</Link></div></section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">{notice}</p>}
    <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Prioridades da equipa · dados atualizados ao abrir ou atualizar</p><button type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" />Atualizar</button></div>
    {summary && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Sem responsável', value: summary.counts.unassigned, hint: 'Assumir e iniciar triagem', action: () => setScope('unassigned') },
      { label: 'Os meus atendimentos', value: summary.counts.mine, hint: 'Confirmar e encaminhar', action: () => setScope('mine') },
    ].map((card) => <button key={card.label} onClick={card.action} disabled={loading} className="rounded-2xl border bg-white p-5 text-left"><p className="text-sm text-slate-600">{card.label}</p><p className="mt-2 text-3xl font-semibold">{card.value}</p><p className="mt-2 text-xs text-brand-700">{card.hint} →</p></button>)}
      <Link href="/admin/apoio" className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-600">Clientes aguardam resposta</p><p className="mt-2 text-3xl font-semibold">{summary.counts.messages}</p><p className="mt-2 text-xs text-brand-700">Abrir mensagens →</p></Link>
      <Link href="/admin/encomendas?status=ready" className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-600">Prontos para entrega</p><p className="mt-2 text-3xl font-semibold">{summary.counts.ready}</p><p className="mt-2 text-xs text-brand-700">Consultar e coordenar →</p></Link></div>}
    {selected && user && <ReceptionRequestPanel key={selected.reference} request={selected} userId={user.id} canReleaseOthers={can('quotes.manage')} onChange={(request) => changed(selected.reference, request)} onClose={() => setSelected(null)} />}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-5 w-5 text-brand-700" />Fila de triagem {summary ? `(${summary.counts.queue})` : ''}</h2><label className="text-sm">Mostrar <select value={scope} disabled={loading} onChange={(event) => setScope(event.target.value)} className="ml-2 rounded-lg border p-2"><option value="all">Todos</option><option value="unassigned">Sem responsável</option><option value="mine">Os meus</option></select></label></div>
        {loading && <p role="status" className="mt-5 text-sm text-slate-500">A carregar pedidos…</p>}
        {!loading && !error && requests.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Não há pedidos nesta fila. Os encaminhados continuam em Pedidos e propostas.</p>}
        <div className="mt-4 space-y-3">{requests.map((request) => <article key={request.reference} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{request.reference} · {sources[request.contact_source] || request.contact_source}</p><h3 className="mt-1 font-semibold">{request.client_name}</h3><p className="mt-1 text-xs text-slate-500">{request.owner_name ? `Com ${request.owner_name}` : 'Sem responsável'} · {new Date(request.created_at).toLocaleDateString('pt-MZ')}</p></div><button type="button" onClick={() => { if (!selected || window.confirm('Abrir este pedido? Guarde primeiro alterações no atendimento atual.')) setSelected(request); }} className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">Abrir triagem</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{request.urgency === 'urgent' && <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">Urgente</span>}{request.missing_information.length > 0 ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800">Falta: {request.missing_information.join(', ')}</span> : <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Dados mínimos disponíveis · confirmar briefing</span>}</div></article>)}</div>
        {next && <button type="button" disabled={loading} onClick={more} className="mt-4 text-sm font-semibold text-brand-700">Mais pedidos</button>}</section>
      <div className="space-y-5"><section className="rounded-2xl border bg-white p-5"><h2 className="flex items-center gap-2 font-semibold"><Headphones className="h-5 w-5 text-brand-700" />Responder aos clientes</h2><p className="mt-2 text-xs text-slate-500">Conversas há mais tempo à espera de resposta.</p><div className="mt-4 space-y-3">{summary?.messages.map((message) => <Link key={message.id} href={`/admin/apoio?conversa=${message.id}`} className="block rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold">{message.client_name}</p><p className="mt-1 text-sm text-slate-600">{message.subject}</p></Link>)}</div>{summary && !summary.messages.length && <p className="mt-4 text-sm text-slate-500">Nenhuma conversa aguarda a MP.</p>}</section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Encaminhados recentemente</h2><p className="mt-2 text-xs text-slate-500">O Comercial continua no mesmo pedido.</p><div className="mt-4 space-y-3">{summary?.handovers.map((handover) => <Link key={handover.reference} href={`/admin/orcamentos/${encodeURIComponent(handover.reference)}`} className="block text-sm"><p className="font-semibold text-brand-800">{handover.reference} →</p><p className="text-slate-600">{handover.client_name}</p></Link>)}</div>{summary && !summary.handovers.length && <p className="mt-4 text-sm text-slate-500">Ainda não há encaminhamentos.</p>}</section>
        <p className="px-1 text-xs leading-5 text-slate-500">A Recepção organiza o atendimento. Preços e propostas são preparados pelo Comercial; faturação e pagamentos ficam com Finanças.</p></div>
    </div>
  </div>;
}
