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
import { ReceptionOverview, taskLabels, type ReceptionHQ } from './ReceptionOverview';
import { ProposalReadView } from './ProposalReadView';
import { Search, Plus, ArrowRight, RefreshCw, LayoutDashboard, Mail, Phone } from 'lucide-react';

const RequestForm = dynamic(() => import('./RequestForm'));
const SupportDesk = dynamic(() => import('@/components/SupportDesk').then((module) => module.SupportDesk));
type QueueQuote = AdminQuote & { owner_name?: string; job_summary?: string; updated_at?: string; reception_completed_at?: string | null; operational_order_status?: string | null };
type Page = { results: QueueQuote[]; next: string | null; count: number };

export function ReceptionWorkspace() {
  const { user, loading, can } = useAdminAuth();
  const allowed = can('reception.manage');
  const [rows, setRows] = useState<QueueQuote[]>([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [scope, setScope] = useState('mine');
  const [state, setState] = useState('active');
  const [hq, setHQ] = useState<ReceptionHQ | null>(null);
  const [hqError, setHQError] = useState('');
  const [task, setTask] = useState('all');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [queueLoading, setQueueLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(true);
  const [queueOpen, setQueueOpen] = useState(true);
  const [inbox, setInbox] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reference, setReference] = useState('');
  const [quote, setQuote] = useState<AdminQuote | null>(null);
  const [triage, setTriage] = useState<ReceptionRequest | null>(null);
  const [newRequest, setNewRequest] = useState(false);
  const [revision, setRevision] = useState(0);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<'work' | 'proposal' | 'messages' | 'history'>('work');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true; setHQ(null); setHQError('');
    fetchWithAuth(`/api/reception/hq/?scope=${scope}`).then((data: ReceptionHQ) => { if (active) setHQ(data); }).catch(() => { if (active) setHQError('As prioridades não estão disponíveis. A fila continua acessível.'); });
    return () => { active = false; };
  }, [loading, allowed, scope, revision]);
  useEffect(() => { setReference(new URLSearchParams(window.location.search).get('pedido') || ''); }, []);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true; generation.current += 1; setQueueLoading(true); setRows([]); setNext(null);
    const query = new URLSearchParams({ operational_state: state, hq: '1' });
    if (scope === 'mine') query.set('proposal_queue', 'mine');
    if (scope === 'unassigned') query.set('operational_scope', 'unassigned');
    if (task !== 'all') query.set('task', task);
    if (searchQuery) query.set('search', searchQuery);
    fetchWithAuth(`/api/quotes/?${query}`).then((page: Page) => { if (active) { setRows(page.results); setNext(page.next); setCount(page.count); } }).catch(() => { if (active) setError('Não foi possível carregar a fila operacional.'); }).finally(() => { if (active) setQueueLoading(false); });
    return () => { active = false; };
  }, [loading, allowed, scope, state, revision, task, searchQuery]);
  useEffect(() => {
    setQuote(null); setTriage(null); setEditing(false);
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
  function saved(value = reference) { setDirty(false); setEditing(false); setNewRequest(false); setReference(value); setRevision((previous) => previous + 1); }
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
  function chooseTask(value: string) { if (!busy) { setQueueOpen(true); setTask(value); setState('active'); } }
  function openCase(value: string) { navigate(() => { setInbox(false); setNewRequest(false); setReference(value); setTab('work'); setShowOverview(false); setQueueOpen(false); }); }
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"><div className="flex flex-wrap gap-2" aria-label="Âmbito do HQ">{[{ value: 'mine', label: 'Os meus atendimentos' }, { value: 'all', label: 'Fila da equipa' }].map((option) => <button disabled={busy} key={option.value} onClick={() => { setScope(option.value); setState('active'); }} aria-pressed={scope === option.value} className={`rounded-xl px-4 py-2 text-sm font-semibold ${scope === option.value ? 'bg-brand-900 text-white' : 'bg-white text-slate-600'}`}>{option.label}</button>)}</div><div className="flex gap-2"><button type="button" onClick={() => setShowOverview(!showOverview)} aria-expanded={showOverview} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><LayoutDashboard className="h-4 w-4" />Resumo do dia</button><button disabled={busy} type="button" onClick={() => navigate(() => { setInbox(false); setNewRequest(true); setReference(''); setShowOverview(false); })} className="flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Novo atendimento</button></div></header>
    {hqError ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{hqError}</p> : null}
    {showOverview ? <ReceptionOverview data={hq} name={user?.first_name || ''} task={task} disabled={busy} onTask={chooseTask} onInbox={() => navigate(() => { setInbox(true); setReference(''); setNewRequest(false); setShowOverview(false); })} onUnassigned={() => { setQueueOpen(true); setScope('unassigned'); setState('active'); setTask('all'); }} /> : null}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}
    <button type="button" aria-controls="reception-queue" aria-expanded={queueOpen} onClick={() => setQueueOpen(!queueOpen)} className="rounded-xl border bg-white px-4 py-2 text-sm xl:hidden">{queueOpen ? 'Recolher fila de atendimentos' : 'Abrir fila de atendimentos'}</button>
    <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"><aside id="reception-queue" className={`overflow-hidden rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-24 ${queueOpen ? 'block' : 'hidden xl:block'}`}><div className="space-y-3 border-b border-slate-100 p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Fila operacional ({queueLoading ? '…' : count})</h2><button aria-label="Atualizar fila" type="button" disabled={dirty || busy} onClick={() => { setError(''); setRevision((value) => value + 1); }} className="rounded-lg p-2 text-slate-500 disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button></div><label className="relative block"><span className="sr-only">Pesquisar cliente ou referência</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, empresa ou referência" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">Responsável<select disabled={busy} value={scope} onChange={(event) => setScope(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="all">Equipa</option><option value="mine">Os meus</option><option value="unassigned">Por assumir</option></select></label><label className="text-xs text-slate-500">Mostrar<select disabled={busy} value={state} onChange={(event) => { setState(event.target.value); setTask('all'); }} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="active">Em acompanhamento</option><option value="waiting">Em espera</option><option value="closed">Arquivo</option></select></label></div><p className="flex items-center justify-between text-xs text-brand-800">{taskLabels[task] || task}{task !== 'all' ? <button onClick={() => chooseTask('all')} className="underline">Limpar filtro</button> : null}</p><p className="text-[11px] text-slate-400">Urgentes, ajustes, entregas e envios primeiro; depois os pedidos sem atualização há mais tempo.</p></div><div className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto">{queueLoading ? <p role="status" className="p-5 text-sm text-slate-500">A organizar os atendimentos…</p> : rows.map((row) => <button type="button" key={row.reference} disabled={busy} aria-pressed={reference === row.reference} onClick={() => openCase(row.reference)} className={`w-full border-l-4 p-4 text-left transition hover:bg-slate-50 ${reference === row.reference ? 'border-l-brand-700 bg-brand-50/70' : 'border-l-transparent'}`}><div className="flex items-center justify-between gap-2"><span className="text-[11px] text-slate-400">{row.reference}</span>{row.urgency === 'urgent' ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Urgente</span> : null}</div><p className="mt-2 font-semibold text-slate-800">{row.client_name}</p><p className="mt-1 truncate text-xs text-slate-500">{row.job_summary || 'Necessidade por confirmar'}</p><p className="mt-3 text-xs font-medium text-brand-800">{row.operational_order_status === 'delivered' ? 'Entregue' : row.status === 'cancelled' ? 'Cancelado' : receptionSteps[receptionStage(row).index]}</p><div className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] text-slate-400"><span>{row.owner_name || 'Por assumir'}</span><span>Atualizado {new Date(row.updated_at || row.created_at).toLocaleDateString('pt-MZ')}</span></div></button>)}</div>{!queueLoading && !rows.length ? <p className="p-5 text-sm text-slate-500">Nenhum pedido neste filtro. Consulte a equipa ou os pedidos por assumir.</p> : null}{next ? <button type="button" disabled={busy || queueLoading} onClick={more} className="w-full border-t p-3 text-sm font-semibold text-brand-800">Mais pedidos</button> : null}</aside>
    <main className="min-w-0 space-y-5" onChangeCapture={() => setDirty(true)}>{inbox ? <Suspense fallback={<p>A carregar a caixa de entrada…</p>}><SupportDesk staff /></Suspense> : newRequest ? <div onChangeCapture={() => setDirty(true)}><RequestForm onSaved={saved} onClose={() => navigate(() => setNewRequest(false))} /></div> : !reference ? <section className="rounded-2xl border bg-white p-8 text-slate-500">O seu espaço está pronto. Escolha um atendimento à esquerda para consultar os detalhes, retomar a próxima ação e acompanhar o cliente.</section> : !quote || !current ? <p>A abrir o pedido…</p> : <><section className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-slate-400">{quote.reference}</p><h2 className="mt-1 text-xl font-semibold">{quote.client_company || quote.client_name}</h2><p className="mt-1 text-sm text-slate-500">{quote.items[0]?.description || quote.reception?.briefing?.project_name || 'Necessidade por confirmar'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{quote.operational_order_status || quote.status_display || quote.status}</span></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{quote.client_email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{quote.client_email}</span> : null}{quote.client_phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{quote.client_phone}</span> : null}<span>NUIT: {quote.client_nuit || 'Por confirmar'}</span><span>Data pretendida: {quote.reception?.briefing?.deadline || 'Por confirmar'}</span></div><OperationalSteps steps={receptionSteps} current={current.index} selected={step} onSelect={(index) => navigate(() => { setStep(index); setTab('work'); })} /><div className={`rounded-xl p-4 ${closed ? 'bg-slate-100' : current.waiting ? 'bg-amber-50' : 'bg-brand-50'}`}><p className="text-xs font-semibold uppercase">{closed ? 'Pedido cancelado' : current.waiting ? 'Em espera' : 'Próxima ação'}</p><p className="mt-1 text-sm">{closed ? 'Consulte o histórico; este pedido não deve avançar.' : current.next}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Responsável: {quote.reception?.owner_name || quote.proposal_workflow?.prepared_by || 'Por assumir'}</p><button type="button" onClick={() => navigate(() => { setStep(current.index); setTab('work'); setEditing(false); })} className="inline-flex items-center gap-2 text-xs font-semibold text-brand-800">Retomar etapa atual<ArrowRight className="h-3 w-3" /></button></div></div><div className="flex gap-3" aria-label="Contexto do pedido">{(['work', 'proposal', 'messages', 'history'] as const).map((value) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => navigate(() => setTab(value))} className="rounded-lg border px-3 py-2 text-sm">{{ work: 'Trabalho', proposal: 'Proposta', messages: 'Mensagens', history: 'Histórico e anexos' }[value]}</button>)}</div></section>
      {tab === 'proposal' ? <ProposalReadView quote={quote} /> : tab === 'messages' ? can('support.manage') ? <Suspense fallback={<p>A carregar mensagens…</p>}><SupportDesk key={reference} staff quoteReference={reference} /></Suspense> : <p>Sem permissão para consultar mensagens.</p> : tab === 'history' ? <section className="space-y-5 rounded-2xl border bg-white p-5"><QuoteRequestEvidence quote={quote} /><ActivityTimeline events={quote.activity || []} /></section> : <div onChangeCapture={() => setDirty(true)}>
        {step === 0 ? triage && user ? <ReceptionRequestPanel embedded request={triage} userId={user.id} canReleaseOthers={can('quotes.review')} onChange={(value) => { setDirty(false); if (value) setTriage(value); else saved(); }} onClose={() => { setDirty(false); setReference(''); }} /> : <section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Briefing confirmado</h3><p className="mt-3 whitespace-pre-wrap text-sm">{quote.reception?.briefing?.description || quote.notes || 'Consulte os materiais e anexos.'}</p><QuoteRequestEvidence quote={quote} /></section> : null}
        {step === 1 ? current.index === 0 || closed ? <p className="rounded-xl border bg-white p-5">Conclua a triagem antes de preparar a proposta.</p> : quote.price_approved_at || quote.order_reference ? <p>Proposta aceite. Consulte a versão no histórico; alterações requerem novo acordo.</p> : <section className="space-y-4">{editing ? <RequestForm key={`${reference}:${revision}`} reference={reference} onSaved={saved} onClose={() => navigate(() => setEditing(false))} /> : <><ProposalReadView quote={quote} /><button type="button" disabled={!can('quotes.manage')} onClick={() => setEditing(true)} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Editar proposta</button></>}</section> : null}
        {(step === 1 && current.index > 0 && !closed) || step === 2 || step === 3 ? <section className="space-y-4">{step !== 1 ? <ProposalReadView quote={quote} /> : null}<ProposalWorkflowCard quote={quote} onChange={() => saved()} /><button type="button" onClick={() => downloadQuotePdf(reference).catch(() => setError('Não foi possível descarregar a proposta.'))} className="rounded-xl border bg-white px-4 py-3 text-sm">Exportar PDF</button>{quote.proposal_workflow?.stage === 'legacy' ? <p className="text-sm">Proposta do fluxo anterior: acompanhe a decisão do cliente nas mensagens.</p> : null}</section> : null}
        {step === 4 ? quote.order_reference ? <OperationalDelivery key={quote.order_reference} reference={quote.order_reference} onSaved={() => setDirty(false)} /> : quote.price_approved_at && can('orders.manage_status') ? <button type="button" disabled={busy} onClick={createOrder} className="rounded-xl bg-brand-800 px-5 py-3 text-white">Criar ordem de produção</button> : <p className="rounded-xl border bg-white p-5">A ordem de produção estará disponível após a aceitação e confirmação comercial.</p> : null}
      </div>}</>}</main></div></div>;
}
