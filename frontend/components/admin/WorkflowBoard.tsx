'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Search, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import type { JobJourney } from '@/lib/workflow';
import { boardColumn, completedColumn, workBoardColumns } from '@/lib/work-board';
import { AttentionBadges } from './ReceptionAttention';
import type { AttentionIssue } from '@/lib/reception-workdesk';
import { requestWorkspaceHref } from '@/lib/admin-workspaces';

type Card = { delivery_method?: string | null; issues?: AttentionIssue[]; reference: string; quote_reference: string | null; order_reference: string | null; client_name: string; summary: string; journey: JobJourney; scheduled_date: string | null; follow_up_date: string | null };
type Snapshot = { results: Card[]; counts: Record<string, number>; count: number; page: number; page_size: number; generated_at: string };

export function WorkflowBoard() {
  const { loading, can } = useAdminAuth();
  const allowed = can('orders.view');
  const params = useSearchParams();
  const router = useRouter();
  const columnKey = params.get('column') || boardColumn(params.get('stage') || 'active');
  const search = params.get('search') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = new URLSearchParams({ column: columnKey, search, page: String(page) }).toString();
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
    if (params.has('stage')) next.set('column', columnKey);
    next.set(key, value); next.delete('stage'); if (key !== 'page') next.delete('page');
    router.replace(`/admin/quadro?${next}`);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); navigate('search', String(new FormData(event.currentTarget).get('search') || '').trim());
  }
  if (loading) return <p role="status">A preparar o quadro…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso ao quadro.</p>;
  const data = snapshot?.query === query ? snapshot.data : null;
  const columns = columnKey === 'active' ? workBoardColumns : [...workBoardColumns, completedColumn].filter(column => column.key === columnKey);
  function href(card: Card) {
    if (card.quote_reference && can('reception.manage')) return requestWorkspaceHref(card.quote_reference, can);
    if (card.order_reference && ['delivery', 'delivered'].includes(card.journey.key)) return `/admin/entregas?encomenda=${encodeURIComponent(card.order_reference)}`;
    if (card.quote_reference && can('production.view') && card.journey.index >= 3) return `/admin/operacoes?pedido=${encodeURIComponent(card.quote_reference)}`;
    return card.quote_reference ? requestWorkspaceHref(card.quote_reference, can) : `/admin/encomendas/${encodeURIComponent(card.order_reference || card.reference)}`;
  }
  return <div className="min-w-0 space-y-5">
    <header className="desk-hero"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Um pedido · Um percurso</p><h1 className="mt-3 font-semibold">Quadro de trabalhos</h1><p className="mt-2 text-sm text-slate-500">Cinco fases para acompanhar o trabalho. Em cada cartão, o estado e o próximo passo.</p></header>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-slate-500">Fase<select value={columnKey} onChange={(event) => navigate('column', event.target.value)} className="mt-1 block min-h-11 rounded-xl border bg-white p-3 text-sm text-brand-900"><option value="active">Todos os trabalhos ativos</option>{[...workBoardColumns, completedColumn].map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
      <form onSubmit={submit} className="flex min-w-0 flex-1 items-center rounded-xl border bg-white px-3"><Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /><input key={search} name="search" defaultValue={search} maxLength={160} aria-label="Pesquisar no quadro" placeholder="Cliente, trabalho ou referência" className="min-w-0 flex-1 bg-transparent p-3 text-sm" /><button type="submit" className="min-h-11 px-2 text-xs font-semibold text-brand-900">Pesquisar</button></form>
      <button type="button" disabled={pending} onClick={() => setRevision((value) => value + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" />Atualizar</button>
    </div>
    {error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p> : null}
    <p aria-live="polite" className="text-xs text-slate-500">{pending ? 'A atualizar…' : data ? `Atualizado às ${new Date(data.generated_at).toLocaleTimeString('pt-MZ', { timeZone: 'Africa/Maputo', hour: '2-digit', minute: '2-digit' })} · Atualização manual` : 'Sem dados disponíveis'}</p>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500" aria-label="Legenda do quadro"><span>○ Normal · inclui esperas dentro do prazo</span><span className="text-amber-800">● Em risco</span><span className="text-red-800">● Atraso / bloqueio</span><span className="text-emerald-800">● Pronto para entrega</span></div>
    {data ? <div aria-label="Quadro de trabalhos" className={`relative grid gap-4 pb-3 md:flex md:overflow-x-auto xl:grid ${columns.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-1'}`}>{columns.map((column) => {
      const cards = data.results.filter((card) => column.stages.includes(card.journey.key));
      const total = column.stages.reduce((sum, stage) => sum + (data.counts[stage] || 0), 0);
      return <section key={column.key} aria-label={column.label} className="min-w-0 rounded-2xl border border-[#dfe3d6] border-t-[3px] border-t-[#b89b59] bg-[#f7f8f2] md:w-64 md:shrink-0 xl:w-auto">
        <header className="flex items-center justify-between gap-3 border-b p-4"><h2 className="text-sm font-semibold text-brand-900">{column.label}</h2><span className="text-xs tabular-nums text-slate-500">{cards.length} / {total}</span></header>
        <div className="space-y-3 p-3">{cards.length ? cards.map((card) => {
          const blocked = Boolean(card.journey.blocker) && !['client', 'art_client'].includes(card.journey.key);
          const critical = blocked || card.issues?.some(issue => ['expired', 'overdue'].includes(issue.kind));
          const risk = card.issues?.some(issue => issue.kind === 'risk');
          const ready = card.journey.key === 'delivery';
          const tone = critical ? 'border-l-red-500' : risk ? 'border-l-amber-500' : ready ? 'border-l-emerald-600' : 'border-l-slate-200';
          return <Link key={card.reference} href={href(card)} className={`block rounded-xl border border-l-[3px] ${tone} bg-white p-4 shadow-sm hover:border-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700`}>
          <p className="text-[10px] font-semibold tracking-wide text-brand-700">{card.reference}</p><h3 className="mt-2 break-words font-semibold text-brand-900">{card.client_name}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.summary}</p>
          <p className="mt-3 text-xs font-semibold text-brand-800">{card.journey.key === 'client' ? 'Aguarda decisão do cliente' : card.journey.key === 'art_client' ? 'Aguarda aprovação da arte' : ready ? card.scheduled_date ? 'Entrega / levantamento agendado' : 'Aguarda entrega / levantamento' : card.journey.label || card.journey.next_action}</p>
          <AttentionBadges issues={card.issues} />{blocked ? <p className="mt-2 text-xs font-semibold text-red-800">Bloqueado · {card.journey.blocker}</p> : null}<p className="mt-2 text-xs text-slate-500">{card.journey.team} · {card.journey.next_action}</p>
          {card.delivery_method ? <p className="mt-2 text-xs text-slate-500">{card.delivery_method === 'delivery' ? 'Entrega no local' : 'Levantamento na MP'}</p> : null}
          {card.scheduled_date ? <p className="mt-3 text-xs text-slate-500">Entrega: {new Date(card.scheduled_date).toLocaleDateString('pt-MZ', { timeZone: 'Africa/Maputo' })}</p> : null}{card.follow_up_date ? <p className="mt-1 text-xs text-slate-500">Seguimento: {card.follow_up_date}</p> : null}<span className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-brand-800">Abrir trabalho<ArrowRight aria-hidden="true" className="h-3 w-3" /></span>
        </Link>; }) : <p className="rounded-xl border border-dashed p-5 text-center text-xs text-slate-500">{total ? 'Trabalhos noutra página. Filtre esta fase.' : 'Sem trabalhos nesta fase'}</p>}</div>
      </section>;
    })}</div> : pending ? <p role="status" className="p-10 text-center">A organizar os pedidos…</p> : null}
    {data ? <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-slate-500"><p>{data.results.length} de {data.count} trabalhos · Página {data.page} · Até 80 por página</p><nav aria-label="Paginação do quadro" className="flex gap-2"><button type="button" disabled={pending || page <= 1} onClick={() => navigate('page', String(page - 1))} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Anterior</button><button type="button" disabled={pending || page * data.page_size >= data.count} onClick={() => navigate('page', String(page + 1))} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Seguinte</button></nav></footer> : null}
    <p className="text-xs text-slate-500">Carregados / total por fase. Abra o trabalho para agir; aprovações e transições mantêm as suas validações.</p>
  </div>;
}
