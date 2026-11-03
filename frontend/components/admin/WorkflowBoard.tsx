'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Search, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { workflowStages, type JobJourney } from '@/lib/workflow';
import { AttentionBadges } from './ReceptionAttention';
import type { AttentionIssue } from '@/lib/reception-workdesk';
import { requestWorkspaceHref } from '@/lib/admin-workspaces';

type Card = { issues?: AttentionIssue[]; reference: string; quote_reference: string | null; order_reference: string | null; client_name: string; summary: string; journey: JobJourney; scheduled_date: string | null; follow_up_date: string | null };
type Snapshot = { results: Card[]; counts: Record<string, number>; count: number; page: number; page_size: number; generated_at: string };

export function WorkflowBoard() {
  const { loading, can } = useAdminAuth();
  const allowed = can('orders.view');
  const params = useSearchParams();
  const router = useRouter();
  const stage = params.get('stage') || 'active';
  const search = params.get('search') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = new URLSearchParams({ stage, search, page: String(page) }).toString();
  const [snapshot, setSnapshot] = useState<{ query: string; data: Snapshot } | null>(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setPending(true); setError('');
    fetchWithAuth(`/api/workflow/board/?${query}`, { signal: controller.signal }).then((data: Snapshot) => {
      if (active) setSnapshot({ query, data });
    }).catch(() => { if (active) setError('Não foi possível atualizar o quadro. Os dados anteriores, quando apresentados, podem estar desatualizados.'); })
      .finally(() => { window.clearTimeout(timeout); if (active) setPending(false); });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [query, revision, loading, allowed]);
  function navigate(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value); if (key !== 'page') next.delete('page');
    router.replace(`/admin/quadro?${next}`);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); navigate('search', String(new FormData(event.currentTarget).get('search') || '').trim());
  }
  if (loading) return <p role="status">A preparar o quadro…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso ao quadro.</p>;
  const data = snapshot?.query === query ? snapshot.data : null;
  const columns = workflowStages.filter((column) => (stage === 'all' || stage === 'active') ? stage === 'all' || column.key !== 'delivered' : column.key === stage);
  function href(card: Card) {
    if (card.quote_reference && can('reception.manage')) return requestWorkspaceHref(card.quote_reference, can);
    if (card.order_reference && ['delivery', 'delivered'].includes(card.journey.key)) return `/admin/entregas?encomenda=${encodeURIComponent(card.order_reference)}`;
    if (card.quote_reference && can('production.view') && card.journey.index >= 3) return `/admin/operacoes?pedido=${encodeURIComponent(card.quote_reference)}`;
    return card.quote_reference ? requestWorkspaceHref(card.quote_reference, can) : `/admin/encomendas/${encodeURIComponent(card.order_reference || card.reference)}`;
  }
  return <div className="min-w-0 space-y-5">
    <header className="desk-hero"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Um pedido · Um percurso</p><h1 className="mt-3 font-semibold">Do primeiro contacto à entrega.</h1><p className="mt-2 text-sm text-slate-500">O mesmo percurso na Recepção, em Operações e no BrandDesk.</p></header>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-slate-500">Etapas<select value={stage} onChange={(event) => navigate('stage', event.target.value)} className="mt-1 block min-h-11 rounded-xl border bg-white p-3 text-sm text-brand-900"><option value="active">Em acompanhamento</option><option value="all">Todas, incluindo entregues</option>{workflowStages.map((column) => <option key={column.key} value={column.key}>{column.shortLabel}</option>)}</select></label>
      <form onSubmit={submit} className="flex min-w-0 flex-1 items-center rounded-xl border bg-white px-3"><Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /><input key={search} name="search" defaultValue={search} maxLength={160} aria-label="Pesquisar no quadro" placeholder="Cliente, trabalho ou referência" className="min-w-0 flex-1 bg-transparent p-3 text-sm" /><button type="submit" className="min-h-11 px-2 text-xs font-semibold text-brand-900">Pesquisar</button></form>
      <button type="button" disabled={pending} onClick={() => setRevision((value) => value + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" />Atualizar</button>
    </div>
    {error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p> : null}
    <p aria-live="polite" className="text-xs text-slate-500">{pending ? 'A atualizar…' : data ? `Atualizado às ${new Date(data.generated_at).toLocaleTimeString('pt-MZ', { timeZone: 'Africa/Maputo', hour: '2-digit', minute: '2-digit' })} · Atualização manual` : 'Sem dados disponíveis'}</p>
    {data ? <div aria-label="Quadro do percurso dos pedidos" className="relative grid gap-4 pb-3 md:flex md:overflow-x-auto">{columns.map((column) => {
      const cards = data.results.filter((card) => card.journey.key === column.key);
      return <section key={column.key} aria-label={column.shortLabel} className="min-w-0 rounded-2xl border border-[#dfe3d6] border-t-[3px] border-t-[#b89b59] bg-[#f7f8f2] md:w-72 md:shrink-0">
        <header className="flex items-center justify-between gap-3 border-b p-4"><h2 className="text-sm font-semibold text-brand-900">{column.shortLabel}</h2><span className="text-xs tabular-nums text-slate-500">{cards.length} / {data.counts[column.key] || 0}</span></header>
        <div className="space-y-3 p-3">{cards.length ? cards.map((card) => <Link key={card.reference} href={href(card)} className="block rounded-xl border bg-white p-4 shadow-sm hover:border-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700">
          <p className="text-[10px] font-semibold tracking-wide text-brand-700">{card.reference}</p><h3 className="mt-2 break-words font-semibold text-brand-900">{card.client_name}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.summary}</p>
          <AttentionBadges issues={card.issues} /><p className="mt-3 text-xs font-medium text-brand-800">{card.journey.team} · {card.journey.next_action}</p>{card.journey.blocker ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{card.journey.blocker}</p> : null}
          {card.scheduled_date ? <p className="mt-3 text-xs text-slate-500">Entrega: {new Date(card.scheduled_date).toLocaleDateString('pt-MZ', { timeZone: 'Africa/Maputo' })}</p> : null}{card.follow_up_date ? <p className="mt-1 text-xs text-slate-500">Seguimento: {card.follow_up_date}</p> : null}<span className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-brand-800">Abrir trabalho<ArrowRight aria-hidden="true" className="h-3 w-3" /></span>
        </Link>) : <p className="rounded-xl border border-dashed p-5 text-center text-xs text-slate-500">{data.counts[column.key] ? 'Trabalhos noutra página. Filtre esta etapa.' : 'Sem trabalhos nesta etapa'}</p>}</div>
      </section>;
    })}</div> : pending ? <p role="status" className="p-10 text-center">A organizar os pedidos…</p> : null}
    {data ? <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-slate-500"><p>{data.results.length} de {data.count} trabalhos · Página {data.page} · Até 80 por página</p><nav aria-label="Paginação do quadro" className="flex gap-2"><button type="button" disabled={pending || page <= 1} onClick={() => navigate('page', String(page - 1))} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Anterior</button><button type="button" disabled={pending || page * data.page_size >= data.count} onClick={() => navigate('page', String(page + 1))} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Seguinte</button></nav></footer> : null}
    <p className="text-xs text-slate-500">Carregados / total por etapa. Abra o trabalho para agir; aprovações e transições mantêm as suas validações.</p>
  </div>;
}
