'use client';

import { Suspense, useEffect, useEffectEvent, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { getQuote, convertQuoteToOrder, type AdminQuote } from '@/lib/admin-api';
import type { ReceptionRequest } from '@/lib/reception-api';
import { receptionStage } from '@/lib/operational-workflow';
import { ReceptionQueue, type QueueQuote } from './ReceptionQueue';
import { ReceptionFilters } from './ReceptionFilters';
import { ReceptionPagination } from './ReceptionPagination';
import { ReceptionOrderSummary } from './ReceptionOrderSummary';
import { ReceptionCaseContext } from './ReceptionCaseContext';
import { ReceptionOrderHeader, type ReceptionTab } from './ReceptionOrderHeader';
import { ReceptionRequestPanel } from './ReceptionRequestPanel';
import { OperationalDelivery } from './OperationalDelivery';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { QuoteRequestEvidence } from '@/components/QuoteRequestEvidence';
import { ReceptionOverview, type ReceptionHQ } from './ReceptionOverview';
import { ProposalReadView } from './ProposalReadView';
import { ArrowLeft, Plus, LayoutDashboard } from 'lucide-react';
import { useReceptionEdit } from '@/hooks/useReceptionEdit';

const RequestForm = dynamic(() => import('./RequestForm'));
const ClientProposalWorkspace = dynamic(() => import('./ClientProposalWorkspace').then((module) => module.ClientProposalWorkspace));
const CommunicationWorkspace = dynamic(() => import('@/components/admin/CommunicationWorkspace').then((module) => module.CommunicationWorkspace));
type Page = { results: QueueQuote[]; next: string | null; count: number };
const QUEUE_PAGE_SIZE = 10;

export function ReceptionWorkspace() {
  const { user, loading, can } = useAdminAuth();
  const allowed = can('reception.manage');
  const canQuoteEdit = can('quotes.manage');
  const [rows, setRows] = useState<QueueQuote[]>([]);
  const [count, setCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [next, setNext] = useState<string | null>(null);
  const scope = 'all';
  const [state, setState] = useState('active');
  const [hq, setHQ] = useState<ReceptionHQ | null>(null);
  const [hqError, setHQError] = useState('');
  const [task, setTask] = useState('all');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [queueLoading, setQueueLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(true);
  const [inbox, setInbox] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reference, setReference] = useState('');
  const [quote, setQuote] = useState<AdminQuote | null>(null);
  const lease = useReceptionEdit(!loading && allowed ? reference : '', quote?.order_reference);
  const [triage, setTriage] = useState<ReceptionRequest | null>(null);
  const [newRequest, setNewRequest] = useState(false);
  const [revision, setRevision] = useState(0);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<ReceptionTab>('summary');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [followUpDirty, setFollowUpDirty] = useState(false);
  const [followUpReset, setFollowUpReset] = useState(0);
  const [tick, setTick] = useState(0);
  const [agendaTick, setAgendaTick] = useState(0);
  const hqScope = useRef('');
  const [busy, setBusy] = useState(false);
  const queueIdentity = useRef('');
  const editAfterLoad = useRef(false);
  const backButton = useRef<HTMLButtonElement>(null);
  const openedReference = useRef(reference); openedReference.current = reference;
  const enterLoadedProposal = useEffectEvent((value: AdminQuote) => { void enterProposal(value); });
  const detailOpen = Boolean(reference || inbox || newRequest);
  useEffect(() => { if (detailOpen) backButton.current?.focus(); }, [detailOpen]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true; if (hqScope.current !== scope) { setHQ(null); hqScope.current = scope; } setHQError('');
    fetchWithAuth(`/api/reception/hq/?scope=${scope}`).then((data: ReceptionHQ) => { if (active) setHQ(data); }).catch(() => { if (active) setHQError('As prioridades não estão disponíveis. A fila continua acessível.'); });
    return () => { active = false; };
  }, [loading, allowed, scope, revision, tick, agendaTick]);
  useEffect(() => { setReference(new URLSearchParams(window.location.search).get('pedido') || ''); }, []);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true; setQueueLoading(true);
    const query = new URLSearchParams({ operational_state: state, hq: '1', page_size: String(QUEUE_PAGE_SIZE) });
    if (task !== 'all') query.set('task', task);
    if (searchQuery) query.set('search', searchQuery);
    if (queueIdentity.current !== query.toString()) {
      setRows([]); setNext(null); setCount(0); queueIdentity.current = query.toString();
      if (pageNumber !== 1) { setPageNumber(1); return; }
    }
    if (pageNumber > 1) query.set('page', String(pageNumber));
    fetchWithAuth(`/api/quotes/?${query}`).then((page: Page) => { if (active) { setRows(page.results); setNext(page.next); setCount(page.count); } }).catch(() => { if (active) setError('Não foi possível carregar a fila operacional.'); }).finally(() => { if (active) setQueueLoading(false); });
    return () => { active = false; };
  }, [loading, allowed, scope, state, revision, task, searchQuery, tick, pageNumber]);
  useEffect(() => {
    setQuote(null); setTriage(null); setEditing(false);
    if (loading || !allowed || !reference) return;
    let active = true;
    getQuote(reference).then(async (value) => {
      if (!active) return;
      setQuote(value); setStep(receptionStage(value).index);
      setEditing(editAfterLoad.current && receptionStage(value).index === 1 && canQuoteEdit); editAfterLoad.current = false;
      if (receptionStage(value).index === 1) enterLoadedProposal(value);
      if (receptionStage(value).index === 0) {
        const request: ReceptionRequest = await fetchWithAuth(`/api/reception/${encodeURIComponent(reference)}/`);
        if (active) setTriage(request);
      }
    }).catch(() => { if (active) setError('Não foi possível abrir este atendimento. Atualize a fila.'); });
    return () => { active = false; };
  }, [reference, revision, loading, allowed, canQuoteEdit]);
  useEffect(() => {
    if (!dirty && !followUpDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, followUpDirty]);
  useEffect(() => {
    if (loading || !allowed || dirty || followUpDirty || busy) return;
    const refresh = () => { if (document.visibilityState === 'visible') setAgendaTick((value) => value + 1); };
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [loading, allowed, dirty, followUpDirty, busy]);
  function navigate(action: () => void) {
    if (busy || lease.pending || ((dirty || followUpDirty) && !window.confirm('Existem alterações por guardar. Deseja sair sem guardar?'))) return;
    if (followUpDirty) setFollowUpReset((value) => value + 1);
    setDirty(false); setFollowUpDirty(false); setError(''); action();
  }
  function saved(value = reference) { setDirty(false); setEditing(false); setNewRequest(false); setReference(value); setRevision((previous) => previous + 1); }
  async function createOrder() {
    if (!quote || busy || !window.confirm('Criar a ordem de produção a partir deste pedido aceite?')) return;
    setBusy(true); setError('');
    try { await convertQuoteToOrder(quote.reference); saved(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar a ordem.'); } finally { setBusy(false); }
  }
  if (loading) return <p>A carregar a área operacional…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso à Recepção.</p>;
  const current = quote ? receptionStage(quote) : null;
  const closed = quote?.status === 'cancelled' || quote?.status === 'delivered' || ['cancelled', 'delivered'].includes(quote?.operational_order_status || '');
  const focusedProposal = Boolean(quote && step === 1 && tab === 'work');
  const focusedClient = Boolean(quote && step === 2 && tab === 'work');
  async function enterProposal(value: AdminQuote, resumeOwn = false) {
    setStep(1); setTab('work'); setEditing(false);
    if (!canQuoteEdit || value.price_approved_at || value.order_reference || ['cancelled', 'delivered'].includes(value.status) || receptionStage(value).index === 0) return;
    setBusy(true); setError('');
    try {
      if (!lease.editable && !await (resumeOwn ? lease.acquire('', true) : lease.acquire())) return;
      const fresh = await getQuote(value.reference);
      if (openedReference.current !== value.reference) return;
      setQuote(fresh);
      if (!fresh.price_approved_at && !fresh.order_reference && !['cancelled', 'delivered'].includes(fresh.status)) setEditing(true);
    } catch { setError('Não foi possível abrir a proposta para edição. Tente novamente.'); }
    finally { setBusy(false); }
  }
  function proposalSaved(value: string, intent?: 'save' | 'send') {
    void intent;
    void lease.release(); setTab('work'); saved(value);
  }
  function clientChanged() {
    setDirty(false); void lease.release();
    getQuote(reference).then(setQuote).catch(() => setError('Atualize o pedido para ver a decisão.'));
    setTick((value) => value + 1);
  }
  function chooseTask(value: string) { if (!busy) { setTask(value); setState('active'); setTick((previous) => previous + 1); } }
  function openCase(value: string) { navigate(() => { setInbox(false); setNewRequest(false); setReference(value); setTab('summary'); }); }
  function backToList() { navigate(() => {
    setBusy(true);
    void Promise.resolve(lease.release()).finally(() => {
      setReference(''); setInbox(false); setNewRequest(false); editAfterLoad.current = false; setBusy(false);
      window.requestAnimationFrame(() => document.getElementById('reception-queue')?.focus());
    });
  }); }
  async function beginEditing(reason = '', resumeOwn = false) {
    if (busy || lease.pending || ((dirty || followUpDirty) && !window.confirm('A edição será retomada com os dados atuais. Descartar este rascunho?'))) return;
    if (await (resumeOwn ? lease.acquire('', true) : lease.acquire(reason))) { editAfterLoad.current = current?.index === 1; setDirty(false); setFollowUpDirty(false); setFollowUpReset((value) => value + 1); setRevision((value) => value + 1); setTab('work'); }
  }
  const ownReservation = Boolean(lease.session && lease.session.editor_id === user?.id && !lease.editable);
  const resumeOwnControl = !closed && ownReservation ? <button type="button" disabled={busy || lease.pending} onClick={() => {
    if (!window.confirm('Retomar a sua edição? Se o pedido estiver aberto noutro separador, essa sessão deixará de poder guardar. Continuar?')) return;
    if (focusedProposal && quote) void enterProposal(quote, true); else void beginEditing('', true);
  }} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-brand-800">Retomar a minha edição</button> : null;
  function finishEditing() { navigate(() => { void lease.release(); setEditing(false); }); }
  return <div className="desk-hq space-y-6">{!focusedProposal ? <header className="desk-toolbar flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div><p className="text-xs uppercase tracking-widest text-brand-700">Recepção · Caixa partilhada</p><p className="mt-1 text-xs text-slate-500">Uma fila para toda a equipa. Cada ação fica registada por quem a realizou.</p></div><div className="flex gap-2">{!detailOpen ? <button type="button" onClick={() => setShowOverview(!showOverview)} aria-expanded={showOverview} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><LayoutDashboard className="h-4 w-4" />Agenda do dia</button> : null}<button disabled={busy || lease.pending} type="button" onClick={() => navigate(() => { setInbox(false); setNewRequest(true); setReference(''); })} className="desk-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Novo atendimento</button></div></header> : null}
    {hqError ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{hqError}</p> : null}
    {showOverview && !detailOpen ? <ReceptionOverview data={hq} name={user?.first_name || ''} task={task} disabled={busy || lease.pending} onTask={chooseTask} onInbox={() => navigate(() => { setInbox(true); setReference(''); setNewRequest(false); })} /> : null}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}
    <section aria-label="Mesa de trabalho da Recepção" className="desk-reception-unit overflow-hidden rounded-2xl border">
    {!detailOpen ? <>
      <ReceptionFilters search={search} state={state} task={task} busy={busy || lease.pending} dirty={dirty || followUpDirty} onSearch={setSearch} onState={(value) => { setState(value); setTask('all'); }} onTask={chooseTask} onRefresh={() => { setError(''); setTick((value) => value + 1); }} />
      <ReceptionQueue rows={rows} count={count} loading={queueLoading} busy={busy || lease.pending} task={task} onOpen={openCase} />
      <ReceptionPagination page={pageNumber} pageSize={QUEUE_PAGE_SIZE} count={count} shown={rows.length} hasNext={Boolean(next)} loading={queueLoading} busy={busy || lease.pending} onPage={(value) => { if (busy || lease.pending || queueLoading) return; setRows([]); setNext(null); setQueueLoading(true); setPageNumber(value); }} />
    </> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 lg:px-5">
        <button ref={backButton} type="button" disabled={busy || lease.pending} onClick={backToList} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 disabled:opacity-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar à lista</button>
        <p className="text-xs text-slate-500">{reference || (inbox ? 'Caixa de entrada' : 'Novo atendimento')}</p>
      </div>
    <section aria-label="Espaço do pedido" className="desk-reception-detail min-h-0 min-w-0 space-y-5 overflow-y-auto p-4 lg:p-5">{inbox ? <Suspense fallback={<p>A carregar a caixa de entrada…</p>}><CommunicationWorkspace onDirtyChange={setDirty} onBusyChange={setBusy} /></Suspense> : newRequest ? <div onChangeCapture={() => setDirty(true)}><RequestForm onSaved={saved} onClose={() => navigate(() => setNewRequest(false))} /></div> : !quote || !current ? <p role="status">A abrir o pedido…</p> : focusedProposal ? <section aria-label="Espaço da proposta" className="space-y-4" onChangeCapture={() => setDirty(true)}>
      {lease.error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{lease.error}</p> : null}
      {resumeOwnControl}
      {current.index === 0 ? <p className="rounded-xl border bg-white p-5">Conclua o briefing antes de preparar a proposta.</p> : closed || quote.price_approved_at || quote.order_reference ? <p className="rounded-xl border bg-white p-5">Esta proposta já não pode ser alterada. Consulte a versão no pedido.</p> : editing ? <fieldset disabled={!lease.editable || lease.pending} className="min-w-0"><RequestForm key={reference} focused initialQuote={quote} reference={reference} onBusyChange={setBusy} onDirtyChange={setDirty} onSaved={proposalSaved} onClose={() => navigate(() => { setTab('summary'); setEditing(false); void lease.release(); })} /></fieldset> : busy || lease.pending ? <p role="status">A abrir a proposta…</p> : <>
        <p role="status" className="rounded-xl border bg-[#f5f7ee] p-4 text-sm">{lease.session ? `Em edição por ${lease.session.editor_name}. Pode consultar a proposta sem alterar o trabalho em curso.` : !canQuoteEdit ? 'A sua função permite apenas consultar esta proposta.' : 'A proposta está em modo de consulta.'}</p>
        <ProposalReadView quote={quote} />
        {!lease.session && canQuoteEdit ? <button type="button" onClick={() => void enterProposal(quote)} className="rounded-xl border px-4 py-3 text-sm font-semibold">Tentar novamente</button> : null}
      </>}
      {!editing ? <button type="button" disabled={busy || lease.pending} onClick={() => navigate(() => setTab('summary'))} className="rounded-xl border px-4 py-3 text-sm">Voltar ao pedido</button> : null}
    </section> : focusedClient ? <>{resumeOwnControl}<ClientProposalWorkspace key={`${reference}:${quote.proposal_workflow?.stage}:${quote.proposal_workflow?.version}:${quote.price_approved_at}`} quote={quote} editable={lease.editable && canQuoteEdit} onAcquire={() => void beginEditing()} onChanged={clientChanged} onBack={() => navigate(() => { void enterProposal(quote); })} onMessages={() => navigate(() => setTab('messages'))} onBusyChange={setBusy} onDirtyChange={setDirty} /></> : <>
      {resumeOwnControl}
      <ReceptionOrderHeader quote={quote} step={step} tab={tab} busy={busy || lease.pending} editControls={<section aria-label="Reserva de edição" className="desk-edit-status border-t pt-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-brand-900">{lease.editable ? 'Está a editar este pedido' : lease.session ? `Em edição por ${lease.session.editor_name}` : 'Disponível para toda a Recepção'}</p><p className="mt-1 text-xs text-slate-500">Consulta partilhada. A reserva protege apenas a edição.</p></div><div className="flex gap-2">{!closed ? lease.editable ? <button disabled={busy || lease.pending} type="button" onClick={finishEditing} className="rounded-lg border px-3 py-2 text-xs font-semibold">Terminar edição</button> : <button disabled={busy || lease.pending || Boolean(lease.session)} type="button" onClick={() => void beginEditing()} className="desk-primary rounded-lg px-3 py-2 text-xs font-semibold text-white">Iniciar edição</button> : null}{!closed && lease.session && !lease.editable && can('quotes.review') ? <button type="button" disabled={busy || lease.pending} onClick={() => { const reason = window.prompt('Motivo para retomar esta edição ativa:'); if (reason?.trim()) void beginEditing(reason.trim()); }} className="rounded-lg border px-3 py-2 text-xs">Retomar com motivo</button> : null}</div></div>{lease.error ? <p role="alert" className="mt-3 text-xs text-amber-900">{lease.error}</p> : null}</section>}
        onStep={(index) => navigate(() => { if (index === 1) { void enterProposal(quote); return; } setStep(index); setTab('work'); })}
        onTab={(value) => navigate(() => { if (value === 'work' && step === 1) { void enterProposal(quote); return; } setTab(value); })}
        onAction={() => { if (current.index === 1) { navigate(() => { void enterProposal(quote); }); return; } if (!lease.editable && !current.waiting && !closed && current.index !== 3) { void beginEditing(); return; } navigate(() => { setStep(current.index); setTab(closed ? 'history' : 'work'); window.requestAnimationFrame(() => document.getElementById('reception-work-panel')?.scrollIntoView({ block: 'start' })); }); }}>
        <ReceptionCaseContext key={`${reference}:${followUpReset}`} quote={quote} canSchedule={!closed && !dirty && lease.editable} busy={busy || lease.pending} onBusy={setBusy}
          onDirty={setFollowUpDirty}
          onSaved={(value) => { setFollowUpDirty(false); setQuote((previous) => previous?.workdesk ? { ...previous, workdesk: { ...previous.workdesk, follow_up_date: value.date, follow_up_note: value.note } } : previous); setTick((previous) => previous + 1); getQuote(quote.reference).then((fresh) => setQuote((previous) => previous?.reference === fresh.reference ? fresh : previous)).catch(() => {}); }} />
      </ReceptionOrderHeader>
      <fieldset disabled={followUpDirty || busy || (tab === 'work' && !lease.editable)} className="min-w-0">
      {tab === 'summary' ? <ReceptionOrderSummary quote={quote} /> : tab === 'proposal' ? <ProposalReadView quote={quote} /> : tab === 'messages' ? can('support.manage') ? <Suspense fallback={<p>A carregar mensagens…</p>}><CommunicationWorkspace key={reference} quoteReference={reference} onDirtyChange={setDirty} onBusyChange={setBusy} /></Suspense> : <p>Sem permissão para consultar mensagens.</p> : tab === 'history' ? <section className="space-y-5 rounded-2xl border bg-white p-5"><QuoteRequestEvidence quote={quote} /><ActivityTimeline events={quote.activity || []} /></section> : <div id="reception-work-panel" className="scroll-mt-24" onChangeCapture={() => setDirty(true)}>
        {step === 0 ? triage && user ? <ReceptionRequestPanel embedded editingAllowed={lease.editable} request={triage} userId={user.id} canReleaseOthers={can('quotes.review')} onChange={(value) => { setDirty(false); if (value) setTriage(value); else saved(); }} onClose={() => { setDirty(false); setReference(''); }} /> : <section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Briefing confirmado</h3><p className="mt-3 whitespace-pre-wrap text-sm">{quote.reception?.briefing?.description || quote.notes || 'Consulte os materiais e anexos.'}</p><QuoteRequestEvidence quote={quote} /></section> : null}
        {step === 3 ? quote.order_reference ? <OperationalDelivery key={quote.order_reference} reference={quote.order_reference} onSaved={() => setDirty(false)} /> : quote.price_approved_at && can('orders.manage_status') ? <button type="button" disabled={busy} onClick={createOrder} className="rounded-xl bg-brand-800 px-5 py-3 text-white">Criar ordem de produção</button> : <p className="rounded-xl border bg-white p-5">A ordem de produção estará disponível após a aceitação do cliente.</p> : null}
      </div>}</fieldset></>}</section></>}
    </section></div>;
}
