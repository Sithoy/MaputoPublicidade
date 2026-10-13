'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Eye, FileText, Mail, RefreshCw, Save, Search, Send, ShieldAlert } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';
import { SupportContextCard, type SupportContext } from '@/components/SupportContext';
import { CorrespondenceFiles, type CorrespondenceFile } from '@/components/CorrespondenceFiles';
import { EmailHistory, type EmailHistoryMessage } from './EmailHistory';
import type { InboxSummary } from './CommunicationWorkspace';

type Thread = { id: number; channel: string; subject: string; client_name: string; email_stage: string; unread_count: number; updated_at: string; email: { address: string; can_reply: boolean }; context?: SupportContext | null };
type Message = EmailHistoryMessage;
type Draft = { attachment_ids?: number[]; subject: string; body: string; template_key: string; version: number; send_state: string; updated_by: string | null; updated_at: string };
type Model = { key: string; name: string; subject: string; body: string; missing: string[] };
type Preview = { html: string; hash: string; missing: string[]; signature_approved?: boolean; signature?: { staff_name?: string; staff_title?: string }; attachments?: CorrespondenceFile[] };
type Page<T> = { results: T[]; next: string | null; count: number };
const base = '/api/support-conversations/';
const stages: Record<string, string> = { new: 'Por tratar', preparing: 'Em preparação', waiting: 'A aguardar cliente', resolved: 'Resolvido' };
const write = (path: string, data: object, method = 'POST') => fetchWithAuth(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const date = (value: string) => new Date(value).toLocaleString('pt-MZ', { dateStyle: 'short', timeStyle: 'short' });

export function EmailDesk({ initialConversation, quoteReference, summary, onDirtyChange, onBusyChange, onChanged }: {
  initialConversation?: number | null; quoteReference?: string; summary?: InboxSummary | null; onDirtyChange?: (value: boolean) => void; onBusyChange?: (value: boolean) => void; onChanged?: () => void;
}) {
  const [rows, setRows] = useState<Thread[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(initialConversation || null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [older, setOlder] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [modelKey, setModelKey] = useState('');
  const [rendered, setRendered] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [contextKind, setContextKind] = useState('quote');
  const [reference, setReference] = useState('');
  const [recovery, setRecovery] = useState('not_sent');
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncNotice, setSyncNotice] = useState('A verificar a caixa Zoho…');
  const [revision, setRevision] = useState(0);
  const [detailRevision, setDetailRevision] = useState(0);
  const dirty = Boolean(draft && saved && (draft.subject !== saved.subject || draft.body !== saved.body || draft.template_key !== saved.template_key || JSON.stringify(draft.attachment_ids || []) !== JSON.stringify(saved.attachment_ids || [])));
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const busyRef = useRef(busy); busyRef.current = busy;
  const syncing = useRef(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { if (initialConversation && !dirtyRef.current && !busyRef.current) setSelected(initialConversation); }, [initialConversation]);
  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true; setSyncBusy(true);
    try { const result = await write('/api/integrations/email/oauth/sync/', {}); setSyncNotice(result.active ? `Caixa atualizada · ${result.imported || 0} novos${result.more ? ' · mais emails por importar' : ''}` : 'Email desativado nas Definições.'); if (result.imported) { setRevision((value) => value + 1); if (!dirtyRef.current && !busyRef.current) setDetailRevision((value) => value + 1); onChanged?.(); } }
    catch { setSyncNotice('Não foi possível sincronizar. Pode continuar a trabalhar nos emails já recebidos.'); }
    finally { syncing.current = false; setSyncBusy(false); }
  }, [onChanged]);
  useEffect(() => { void sync(); const timer = window.setInterval(() => { void sync(); }, 60000); return () => window.clearInterval(timer); }, [sync]);
  useEffect(() => {
    let alive = true; setLoading(true);
    const params = new URLSearchParams({ channel_group: 'email' }); if (stage) params.set('email_stage', stage); if (query) params.set('q', query); if (quoteReference) params.set('operational_quote', quoteReference);
    fetchWithAuth(`${base}?${params}`).then((page: Page<Thread>) => { if (alive) { setRows(page.results); setNext(page.next); setCount(page.count); } }).catch(() => { if (alive) setError('Não foi possível carregar a caixa de email.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [stage, query, quoteReference, revision]);
  useEffect(() => {
    let alive = true;
    setThread(null); setDraft(null); setSaved(null); setMessages([]); setRendered(null); setConfirmed(false); setError('');
    if (!selected) return;
    Promise.all([fetchWithAuth(`${base}${selected}/`), fetchWithAuth(`${base}${selected}/messages/`), fetchWithAuth(`${base}${selected}/email-draft/`), fetchWithAuth(`${base}${selected}/email-models/`)])
      .then(async ([value, history, stored, starters]: [Thread, Page<Message>, Draft, { models: Model[] }]) => {
        if (!alive) return;
        if (value.channel !== 'email') throw new Error('Este contacto pertence à área Conversas.');
        setThread(value); setMessages(history.results); setOlder(history.next); setDraft(stored); setSaved(stored); setModels(starters.models); setModelKey(stored.template_key); setRecoveryConfirmed(false);
        if (history.results.length) { await write(`${base}${selected}/read/`, { through_id: history.results[0].id }); if (alive) { setRows((current) => current.map((row) => row.id === selected ? { ...row, unread_count: 0 } : row)); onChanged?.(); } }
      }).catch(() => { if (alive) setError('Não foi possível abrir este email. Confirme o acesso e tente novamente.'); });
    return () => { alive = false; };
  }, [selected, detailRevision, onChanged]);
  function choose(id: number) {
    if (busy || (id !== selected && dirty && !window.confirm('O rascunho tem alterações não guardadas. Abrir outro email sem as guardar?'))) return;
    setNotice(''); setSelected(id);
  }
  function edit(values: Partial<Draft>) { if (draft) setDraft({ ...draft, ...values }); setRendered(null); setConfirmed(false); setNotice(''); }
  async function action(work: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await work(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir.'); } finally { setBusy(false); } }
  async function save() { if (!selected || !draft) return; await action(async () => { const value = await write(`${base}${selected}/email-draft/`, { version: draft.version, subject: draft.subject, body: draft.body, template_key: draft.template_key, attachment_ids: draft.attachment_ids || [] }, 'PATCH'); setDraft(value); setSaved(value); setRendered(null); setConfirmed(false); setNotice('Rascunho guardado na caixa partilhada.'); setRevision((value) => value + 1); onChanged?.(); }); }
  async function reloadDraft() {
    if (!selected || busy || (dirty && !window.confirm('Recarregar o rascunho partilhado e descartar as alterações não guardadas?'))) return;
    await action(async () => {
      const value: Draft = await fetchWithAuth(`${base}${selected}/email-draft/`);
      setDraft(value); setSaved(value); setModelKey(value.template_key); setRendered(null); setConfirmed(false);
      setNotice('Rascunho partilhado recarregado.');
    });
  }
  async function loadMore(url: string, history = false) { await action(async () => { const path = new URL(url, window.location.origin); if (!path.pathname.startsWith(base)) throw new Error('Página inválida.'); const page = await fetchWithAuth(path.pathname + path.search); if (history) { setMessages((current) => [...current, ...page.results].filter((row, index, all) => all.findIndex((entry) => entry.id === row.id) === index)); setOlder(page.next); } else { setRows((current) => [...current, ...page.results].filter((row, index, all) => all.findIndex((entry) => entry.id === row.id) === index)); setNext(page.next); } }); }
  function applyModel() { const chosen = models.find((entry) => entry.key === modelKey); if (!chosen || (draft?.body && !window.confirm('Substituir o texto do rascunho pelo modelo selecionado?'))) return; edit({ subject: chosen.subject, body: chosen.body, template_key: chosen.key }); }
  async function sendDraft() { if (!selected || !draft || !rendered || dirty || !confirmed) return; await action(async () => { try { const result = await write(`${base}${selected}/email-send/`, { version: draft.version, preview_hash: rendered.hash, confirmed }); setDraft(result.draft); setSaved(result.draft); setRendered(null); setConfirmed(false); setNotice(result.detail); setDetailRevision((value) => value + 1); setRevision((value) => value + 1); onChanged?.(); } catch (reason) { try { const stored = await fetchWithAuth(`${base}${selected}/email-draft/`); setDraft(stored); setSaved(stored); setRendered(null); setConfirmed(false); } catch { /* Keep the original draft and send failure. */ } throw reason; } }); }
  const locked = Boolean(draft && draft.send_state !== 'idle');
  return <section className="space-y-4" aria-label="Correspondência por email">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-brand-900">Correio do Atendimento</h3><p className="mt-1 text-xs text-slate-500">atendimento@maputopublicidade.com · {syncNotice}</p></div><button type="button" disabled={syncBusy || busy} onClick={() => { void sync(); setRevision((value) => value + 1); if (!dirty) setDetailRevision((value) => value + 1); }} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" />{syncBusy ? 'A sincronizar…' : 'Atualizar caixa'}</button></div>
    <div className="flex flex-wrap gap-2" aria-label="Estados dos emails"><button type="button" aria-pressed={!stage} onClick={() => setStage('')} className={`rounded-lg border px-3 py-2 text-xs ${!stage ? 'bg-brand-800 text-white' : 'bg-white'}`}>Todos</button>{Object.entries(stages).map(([key, label]) => <button type="button" key={key} aria-pressed={stage === key} onClick={() => setStage(key)} className={`rounded-lg border px-3 py-2 text-xs ${stage === key ? 'bg-brand-800 text-white' : 'bg-white'}`}>{label}{summary?.stages ? ` (${summary.stages[key] || 0})` : ''}</button>)}</div>
    {error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{error}</p>{selected && draft ? <button type="button" disabled={busy} onClick={() => void reloadDraft()} className="mt-2 font-semibold underline">Recarregar rascunho partilhado</button> : null}</div> : null}{notice ? <p role="status" className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">{notice}</p> : null}
    <div className="grid overflow-hidden rounded-2xl border border-[#dce3d5] bg-white xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside aria-label="Lista de emails" className="border-b bg-[#f8f9f4] xl:border-b-0 xl:border-r"><div className="border-b p-4"><label className="flex items-center gap-2 rounded-xl border bg-white px-3"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Pesquisar emails" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Remetente ou assunto" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label><p className="mt-3 text-[11px] text-slate-500">{loading ? 'A carregar…' : `${count} emails · lido não significa resolvido`}</p></div><div className="max-h-[780px] overflow-y-auto">{rows.map((row) => <button key={row.id} type="button" disabled={busy} onClick={() => choose(row.id)} aria-pressed={selected === row.id} className={`w-full border-b p-4 text-left ${selected === row.id ? 'border-l-4 border-l-[#b69a52] bg-[#eaf0e5]' : 'hover:bg-white'}`}><div className="flex items-center justify-between gap-2"><p className={`truncate text-sm text-brand-900 ${row.unread_count ? 'font-bold' : 'font-medium'}`}>{row.client_name}</p>{row.unread_count ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-700" aria-label="Por ler" /> : null}</div><p className="mt-2 line-clamp-2 text-xs font-medium text-slate-700">{row.subject}</p><div className="mt-3 flex justify-between gap-2 text-[10px] text-slate-500"><span>{stages[row.email_stage] || 'Por tratar'}</span><time dateTime={row.updated_at}>{date(row.updated_at)}</time></div></button>)}{!loading && !rows.length ? <p className="p-6 text-sm text-slate-500">Não existem emails neste filtro.</p> : null}</div>{next ? <button type="button" disabled={busy} onClick={() => void loadMore(next)} className="m-4 text-xs font-semibold text-brand-800">Mais emails →</button> : null}</aside>
      <div className="min-w-0 p-5 lg:p-7">{!selected ? <div className="flex min-h-[450px] flex-col items-center justify-center text-center"><Mail className="h-10 w-10 text-[#b69a52]" /><h3 className="mt-5 text-xl font-semibold text-brand-900">Cada email, com o contexto certo.</h3><p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Abra um email para ler, associar a um pedido e preparar uma resposta. Os modelos ajudam; o envio continua sob o seu controlo.</p></div> : !thread || !draft ? <p role="status">A abrir correspondência…</p> : <>
        <header className="border-b pb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-[#a28640]">CORRESPONDÊNCIA · EMAIL</p><h3 className="mt-2 text-xl font-semibold text-brand-900">{thread.subject}</h3><p className="mt-2 text-sm text-slate-500">{thread.client_name} · {thread.email.address}</p></div><label className="text-xs text-slate-500">Estado de trabalho<select aria-label="Estado do email" value={thread.email_stage} disabled={busy} onChange={(event) => void action(async () => { const value = await write(`${base}${selected}/email-stage/`, { stage: event.target.value }, 'PATCH'); setThread(value); setRevision((value) => value + 1); onChanged?.(); })} className="mt-2 block rounded-lg border p-2 text-xs text-brand-800">{Object.entries(stages).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div></header>
        <section className="my-5 rounded-xl border border-[#e4e8de] bg-[#fafbf7] p-4" aria-label="Contexto do email">{thread.context ? <SupportContextCard context={thread.context} staff /> : <p className="text-xs text-slate-500">Ainda sem pedido associado. A associação permite preencher os modelos com dados reais.</p>}<div className="mt-3 flex flex-wrap gap-2"><select aria-label="Tipo de contexto" value={contextKind} onChange={(event) => setContextKind(event.target.value)} className="rounded-lg border bg-white p-2 text-xs"><option value="quote">Pedido / proposta</option><option value="order">Projeto</option><option value="invoice">Fatura</option></select><input aria-label="Referência para associar" placeholder="Ex.: MP-0001-2026" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={30} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-xs" /><button type="button" disabled={busy || !reference.trim()} onClick={() => void action(async () => { const value = await write(`${base}${selected}/email-context/`, { kind: contextKind, reference: reference.trim() }, 'PATCH'); setThread(value); const result = await fetchWithAuth(`${base}${selected}/email-models/`); setModels(result.models); setNotice('Contexto associado. O rascunho existente não foi alterado.'); })} className="rounded-lg bg-brand-800 px-3 py-2 text-xs text-white">Associar</button></div></section>
        <section aria-label="Histórico de emails" className="mb-6 max-h-[500px] space-y-3 overflow-y-auto"><EmailHistory messages={messages} subject={thread.subject} clientName={thread.client_name} address={thread.email.address} busy={busy} onLoadFiles={(message_id) => void action(async () => { const result = await write(`${base}${selected}/email-files/`, { message_id }); setMessages((current) => current.map((entry) => entry.id === message_id ? { ...entry, files: result.files } : entry)); setNotice(result.detail); })} />{older && <button type="button" disabled={busy} onClick={() => void loadMore(older, true)} className="text-xs font-semibold text-brand-800">Correspondência anterior →</button>}</section>
        <section aria-label="Preparar resposta por email" className="rounded-2xl border border-[#dce3d5] bg-[#fcfcf8] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="flex items-center gap-2 font-semibold text-brand-900"><FileText className="h-4 w-4 text-[#a28640]" />Preparar resposta</h4><span className={`text-[11px] ${dirty ? 'text-amber-800' : 'text-slate-500'}`}>{dirty ? 'Alterações por guardar' : saved?.updated_by ? `Guardado por ${saved.updated_by}` : 'Rascunho partilhado'}</span></div>
          {locked ? <aside className="my-4 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900"><p className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />{draft.send_state === 'sending' ? 'Envio em curso' : 'Envio não confirmado'}</p><p>O rascunho está protegido contra duplicação. Verifique primeiro a pasta Enviados no Zoho.</p><a href="https://mail.zoho.com/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Abrir Zoho Mail</a><select aria-label="Resultado da verificação no Zoho" value={recovery} onChange={(event) => setRecovery(event.target.value)} className="mt-3 block w-full rounded-lg border bg-white p-2"><option value="not_sent">Verifiquei: não foi enviado</option><option value="sent">Verifiquei: foi enviado</option></select><label className="mt-3 flex gap-2"><input type="checkbox" checked={recoveryConfirmed} onChange={(event) => setRecoveryConfirmed(event.target.checked)} />Confirmo que verifiquei manualmente na caixa Zoho.</label><button type="button" disabled={busy || !recoveryConfirmed} onClick={() => void action(async () => { const value = await write(`${base}${selected}/email-recover/`, { version: draft.version, outcome: recovery, confirmed: recoveryConfirmed }); setDraft(value); setSaved(value); setRecoveryConfirmed(false); setDetailRevision((value) => value + 1); setNotice('Verificação registada. Nenhum email foi reenviado automaticamente.'); })} className="mt-3 rounded-lg border bg-white px-3 py-2">Registar verificação</button></aside> : null}
          <fieldset disabled={busy || locked} className="mt-4 space-y-4"><div className="flex flex-wrap gap-2"><select aria-label="Modelo de email" value={modelKey} onChange={(event) => setModelKey(event.target.value)} className="min-w-0 flex-1 rounded-xl border bg-white p-3 text-sm"><option value="">Escolher modelo…</option>{models.map((model) => <option key={model.key} value={model.key}>{model.name}</option>)}</select><button type="button" disabled={!modelKey} onClick={applyModel} className="flex items-center gap-1 rounded-xl border bg-white px-3 text-xs font-medium text-brand-800">Aplicar modelo<ChevronRight className="h-3 w-3" /></button></div><p className="text-[11px] text-slate-500">Os modelos não enviam emails nem substituem a validação comercial. Complete os campos entre ⟦ ⟧.</p><label className="block text-xs text-slate-500">Para<input readOnly value={thread.email.address} className="mt-2 w-full rounded-xl border bg-slate-50 p-3 text-sm" /></label><label className="block text-xs text-slate-500">Assunto<input value={draft.subject} onChange={(event) => edit({ subject: event.target.value })} maxLength={255} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" /></label><label className="block text-xs text-slate-500">Texto do email<textarea value={draft.body} onChange={(event) => edit({ body: event.target.value })} rows={10} maxLength={4000} className="mt-2 w-full resize-y rounded-xl border bg-white p-4 text-sm leading-7" /></label><p className="text-right text-[10px] text-slate-400">{draft.body.length}/4000 · assinatura MP adicionada no envio</p></fieldset>
          <CorrespondenceFiles staff refreshKey={draft.version} onBusyChange={setBusy} key={selected} conversationId={selected} ids={draft.attachment_ids || []} onChange={(attachment_ids) => edit({ attachment_ids })} disabled={busy || locked} />
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy || locked || !dirty} onClick={() => void save()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-semibold text-brand-800"><Save className="h-4 w-4" />Guardar rascunho</button><button type="button" disabled={busy || locked || dirty || !draft.body.trim()} onClick={() => void action(async () => { const value = await write(`${base}${selected}/email-preview/`, { version: draft.version }); setRendered(value); setConfirmed(false); })} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-semibold text-brand-800"><Eye className="h-4 w-4" />Pré-visualizar email</button></div>
          {rendered ? <section aria-label="Revisão do email" className="mt-5 space-y-3">{rendered.signature_approved === false ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Ainda sem assinatura aprovada. Peça a aprovação em Definições → Email antes de enviar.</p> : <p className="text-xs text-brand-800">Assinatura: {rendered.signature?.staff_name} · {rendered.signature?.staff_title}</p>}{rendered.attachments?.map((file) => <p key={file.id} className="text-xs text-slate-600">Anexo a enviar: {file.name}</p>)}{rendered.missing.length ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Complete antes de enviar: {rendered.missing.join(', ')}</p> : null}<iframe title="Pré-visualização do email" sandbox="" srcDoc={rendered.html} className="h-[520px] w-full rounded-xl border bg-white" /><label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={confirmed} disabled={busy || rendered.missing.length > 0} onChange={(event) => setConfirmed(event.target.checked)} />Revi o destinatário, o conteúdo e os dados do pedido. Confirmo o envio desta versão.</label><button type="button" disabled={busy || dirty || locked || rendered.signature_approved === false || !thread.email.can_reply || !confirmed || rendered.missing.length > 0} onClick={() => void sendDraft()} className="flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar email revisto<Check className="h-4 w-4" /></button></section> : null}
        </section><p className="mt-4 text-[11px] leading-5 text-slate-500">Emails não confirmam a identidade do remetente. PDF e imagens podem ser enviados como anexos. Encaminhamento e outros formatos continuam na caixa Zoho. A sincronização requer esta área aberta.</p>
      </>}</div>
    </div>
  </section>;
}
