'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { getQuote, convertQuoteToOrder, downloadQuotePdf, type AdminQuote } from '@/lib/admin-api';
import type { ReceptionRequest } from '@/lib/reception-api';
import { receptionStage, receptionSteps } from '@/lib/operational-workflow';
import { OperationalSteps } from './OperationalSteps';
import { ReceptionRequestPanel } from './ReceptionRequestPanel';
import { ProposalWorkflowCard } from './ProposalWorkflowCard';
import { OperationalDelivery } from './OperationalDelivery';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { QuoteRequestEvidence } from '@/components/QuoteRequestEvidence';

const RequestForm = dynamic(() => import('./RequestForm'));
const SupportDesk = dynamic(() => import('@/components/SupportDesk').then((module) => module.SupportDesk));
type QueueQuote = AdminQuote & { reception_completed_at?: string | null; operational_order_status?: string | null };
type Page = { results: QueueQuote[]; next: string | null; count: number };

export function ReceptionWorkspace() {
  const { user, loading, can } = useAdminAuth();
  const allowed = can('reception.manage');
  const [rows, setRows] = useState<QueueQuote[]>([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [scope, setScope] = useState('all');
  const [state, setState] = useState('active');
  const [reference, setReference] = useState('');
  const [quote, setQuote] = useState<AdminQuote | null>(null);
  const [triage, setTriage] = useState<ReceptionRequest | null>(null);
  const [newRequest, setNewRequest] = useState(false);
  const [revision, setRevision] = useState(0);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<'work' | 'messages' | 'history'>('work');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => { setReference(new URLSearchParams(window.location.search).get('pedido') || ''); }, []);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true; generation.current += 1;
    const query = new URLSearchParams({ operational_state: state });
    if (scope === 'mine') query.set('proposal_queue', 'mine');
    if (scope === 'unassigned') query.set('operational_scope', 'unassigned');
    fetchWithAuth(`/api/quotes/?${query}`).then((page: Page) => { if (active) { setRows(page.results); setNext(page.next); setCount(page.count); } }).catch(() => { if (active) setError('Não foi possível carregar a fila operacional.'); });
    return () => { active = false; };
  }, [loading, allowed, scope, state, revision]);
  useEffect(() => {
    setQuote(null); setTriage(null);
    if (loading || !allowed || !reference) return;
    let active = true;
    getQuote(reference).then(async (value) => {
      if (!active) return;
      setQuote(value); setStep(receptionStage(value).index);
      if (receptionStage(value).index === 0) {
        const request: ReceptionRequest = await fetchWithAuth(`/api/reception/${encodeURIComponent(reference)}/`);
        if (active) setTriage(request);
      }
    }).catch(() => { if (active) setError('Não foi possível abrir este atendimento. Atualize a fila.'); });
    return () => { active = false; };
  }, [reference, revision, loading, allowed]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function navigate(action: () => void) {
    if (busy || (dirty && !window.confirm('Existem alterações por guardar. Deseja sair sem guardar?'))) return;
    setDirty(false); setError(''); action();
  }
  function saved(value = reference) { setDirty(false); setNewRequest(false); setReference(value); setRevision((previous) => previous + 1); }
  async function more() {
    if (!next || busy) return;
    const current = generation.current; setBusy(true);
    try { const path = new URL(next, window.location.origin); const page: Page = await fetchWithAuth(path.pathname + path.search); if (current === generation.current) { setRows((rows) => [...rows, ...page.results].filter((row, index, all) => all.findIndex((other) => other.reference === row.reference) === index)); setNext(page.next); } }
    catch { setError('Não foi possível carregar mais pedidos.'); } finally { setBusy(false); }
  }
  async function createOrder() {
    if (!quote || busy || !window.confirm('Criar a ordem de produção a partir deste pedido aceite?')) return;
    setBusy(true); setError('');
    try { await convertQuoteToOrder(quote.reference); saved(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar a ordem.'); } finally { setBusy(false); }
  }
  if (loading) return <p>A carregar a área operacional…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso à Recepção.</p>;
  const current = quote ? receptionStage(quote) : null;
  const closed = quote?.status === 'cancelled';
  return <div className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-brand-900 p-6 text-white"><div><p className="text-xs uppercase tracking-widest text-brand-200">Área operacional · Recepção</p><h1 className="mt-2 text-2xl font-semibold">Uma conversa. Um pedido. Todo o acompanhamento.</h1></div><button disabled={busy} type="button" onClick={() => navigate(() => { setNewRequest(true); setReference(''); })} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-900">Novo atendimento</button></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}
    <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]"><aside className="space-y-4 rounded-2xl border bg-white p-4"><h2 className="font-semibold">Fila operacional ({count})</h2><label className="block text-sm">Responsável<select disabled={busy} value={scope} onChange={(event) => setScope(event.target.value)} className="mt-2 w-full rounded-lg border p-2"><option value="all">Todos</option><option value="mine">Os meus atendimentos</option><option value="unassigned">Por assumir</option></select></label><label className="block text-sm">Mostrar<select disabled={busy} value={state} onChange={(event) => setState(event.target.value)} className="mt-2 w-full rounded-lg border p-2"><option value="active">Em acompanhamento</option><option value="waiting">Aguardar Comercial / cliente</option><option value="closed">Concluídos / cancelados</option></select></label><button type="button" disabled={dirty || busy} onClick={() => { setError(''); setRevision((value) => value + 1); }} className="text-sm text-brand-800 disabled:opacity-50">Atualizar fila</button><div className="space-y-2">{rows.map((row) => <button type="button" key={row.reference} disabled={busy} aria-pressed={reference === row.reference} onClick={() => navigate(() => { setNewRequest(false); setReference(row.reference); setTab('work'); })} className={`w-full rounded-xl border p-3 text-left ${reference === row.reference ? 'border-brand-700 bg-brand-50' : ''}`}><p className="text-xs text-slate-500">{row.reference}</p><p className="mt-1 font-semibold">{row.client_name}</p><p className="mt-2 text-xs text-brand-800">{row.operational_order_status === 'delivered' ? 'Entregue' : row.status === 'cancelled' ? 'Cancelado' : receptionSteps[receptionStage(row).index]}</p></button>)}</div>{!rows.length ? <p className="text-sm text-slate-500">Nenhum pedido nesta fila.</p> : null}{next ? <button type="button" disabled={busy} onClick={more}>Mais pedidos</button> : null}</aside>
    <main className="min-w-0 space-y-5" onChangeCapture={() => setDirty(true)}>{newRequest ? <div onChangeCapture={() => setDirty(true)}><RequestForm onSaved={saved} onClose={() => navigate(() => setNewRequest(false))} /></div> : !reference ? <section className="rounded-2xl border bg-white p-8 text-slate-500">Abra um pedido da fila ou registe um novo atendimento.</section> : !quote || !current ? <p>A abrir o pedido…</p> : <><section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">{quote.reference} · {quote.client_name}</h2><OperationalSteps steps={receptionSteps} current={current.index} selected={step} onSelect={(index) => navigate(() => { setStep(index); setTab('work'); })} /><div className={`rounded-xl p-4 ${closed ? 'bg-slate-100' : current.waiting ? 'bg-amber-50' : 'bg-brand-50'}`}><p className="text-xs font-semibold uppercase">{closed ? 'Pedido cancelado' : current.waiting ? 'Em espera' : 'Próxima ação'}</p><p className="mt-1 text-sm">{closed ? 'Consulte o histórico; este pedido não deve avançar.' : current.next}</p><p className="mt-2 text-xs text-slate-500">Responsável: {quote.proposal_workflow?.prepared_by || quote.reception?.owner_name || 'Por assumir'}</p></div><div className="flex gap-3" aria-label="Contexto do pedido">{(['work', 'messages', 'history'] as const).map((value) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => navigate(() => setTab(value))} className="rounded-lg border px-3 py-2 text-sm">{{ work: 'Trabalho', messages: 'Mensagens', history: 'Histórico e anexos' }[value]}</button>)}</div></section>
      {tab === 'messages' ? can('support.manage') ? <Suspense fallback={<p>A carregar mensagens…</p>}><SupportDesk key={reference} staff quoteReference={reference} /></Suspense> : <p>Sem permissão para consultar mensagens.</p> : tab === 'history' ? <section className="space-y-5 rounded-2xl border bg-white p-5"><QuoteRequestEvidence quote={quote} /><ActivityTimeline events={quote.activity || []} /></section> : <div onChangeCapture={() => setDirty(true)}>
        {step === 0 ? triage && user ? <ReceptionRequestPanel embedded request={triage} userId={user.id} canReleaseOthers={can('quotes.review')} onChange={(value) => { setDirty(false); if (value) setTriage(value); else saved(); }} onClose={() => { setDirty(false); setReference(''); }} /> : <section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Briefing confirmado</h3><p className="mt-3 whitespace-pre-wrap text-sm">{quote.reception?.briefing?.description || quote.notes || 'Consulte os materiais e anexos.'}</p><QuoteRequestEvidence quote={quote} /></section> : null}
        {step === 1 ? current.index === 0 || closed ? <p className="rounded-xl border bg-white p-5">Conclua a triagem antes de preparar a proposta.</p> : quote.price_approved_at || quote.order_reference ? <p>Proposta aceite. Consulte a versão no histórico; alterações requerem novo acordo.</p> : <RequestForm key={`${reference}:${revision}`} reference={reference} onSaved={saved} onClose={() => navigate(() => setStep(current.index))} /> : null}
        {(step === 1 && current.index > 0 && !closed) || step === 2 || step === 3 ? <section className="space-y-4"><ProposalWorkflowCard quote={quote} onChange={() => saved()} /><button type="button" onClick={() => downloadQuotePdf(reference).catch(() => setError('Não foi possível descarregar a proposta.'))} className="rounded-xl border bg-white px-4 py-3 text-sm">Consultar PDF da proposta</button>{quote.proposal_workflow?.stage === 'legacy' ? <p className="text-sm">Proposta do fluxo anterior: acompanhe a decisão do cliente nas mensagens.</p> : null}</section> : null}
        {step === 4 ? quote.order_reference ? <OperationalDelivery key={quote.order_reference} reference={quote.order_reference} onSaved={() => setDirty(false)} /> : quote.price_approved_at && can('orders.manage_status') ? <button type="button" disabled={busy} onClick={createOrder} className="rounded-xl bg-brand-800 px-5 py-3 text-white">Criar ordem de produção</button> : <p className="rounded-xl border bg-white p-5">A ordem de produção estará disponível após a aceitação e confirmação comercial.</p> : null}
      </div>}</>}</main></div></div>;
}
