'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Headphones, Plus, RefreshCw, Send } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';
import { WhatsAppAttachment, type WhatsAppFile } from './WhatsAppAttachment';
import { WhatsAppTemplateComposer } from './WhatsAppTemplateComposer';
import { SupportContextCard, SupportContextPicker, type SupportContext } from './SupportContext';

type Conversation = {
  channel?: 'branddesk' | 'whatsapp';
  whatsapp?: { phone: string; can_reply: boolean; coexistence: boolean; last_inbound_at: string | null } | null;
  id: number; subject: string; client_name: string; status: string; unread_count: number;
  quote_reference: string; order_reference: string;
  context?: SupportContext | null;
};
type Message = { id: number; body: string; is_staff: boolean; created_at: string; source?: string; delivery_status?: string; attachment?: WhatsAppFile | null; template?: { name: string; language: string } | null };
type Page<T> = { results: T[]; next: string | null };
const base = '/api/support-conversations/';
const statuses: Record<string, string> = {
  awaiting_team: 'A aguardar a MP', awaiting_client: 'A aguardar o cliente', resolved: 'Resolvida',
};
const write = (path: string, data: object) => fetchWithAuth(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});

export function SupportDesk({ staff = false }: { staff?: boolean }) {
  const params = useSearchParams();
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [nextThreads, setNextThreads] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(() => Number(params.get('conversa')) || null);
  const [detail, setDetail] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [older, setOlder] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState('');
  const [chosenContext, setChosenContext] = useState<SupportContext | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const active = useRef(selected);
  active.current = selected;
  const key = String(selected ?? 'new');
  const draft = drafts[key] || '';
  const quote = params.get('pedido') || '';
  const order = params.get('projeto') || '';
  const invoice = params.get('fatura') || '';
  const initialContext = quote ? { kind: 'quote' as const, reference: quote } : order ? { kind: 'order' as const, reference: order } : invoice ? { kind: 'invoice' as const, reference: invoice } : null;
  const requestedConversation = params.get('conversa');

  useEffect(() => {
    setSelected(Number(requestedConversation) || null);
  }, [requestedConversation, quote, order, invoice]);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth(base).then((page: Page<Conversation>) => {
      if (!cancelled) { setThreads(page.results); setNextThreads(page.next); }
    }).catch(() => { if (!cancelled) setError('Não foi possível carregar as conversas. Tente atualizar.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null); setMessages([]); setOlder(null); setError('');
    if (!selected) return;
    Promise.all([fetchWithAuth(`${base}${selected}/`), fetchWithAuth(`${base}${selected}/messages/`)])
      .then(async ([conversation, page]: [Conversation, Page<Message>]) => {
        if (cancelled) return;
        setDetail(conversation); setMessages([...page.results].reverse()); setOlder(page.next);
        if (page.results.length) {
          await write(`${base}${selected}/read/`, { through_id: page.results[0].id });
          if (!cancelled) setThreads((rows) => rows.map((row) => row.id === selected ? { ...row, unread_count: 0 } : row));
        }
      }).catch(() => { if (!cancelled) setError('Não foi possível abrir a conversa. Tente atualizar.'); });
    return () => { cancelled = true; };
  }, [selected, revision]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy || (!selected && !contextReady)) return;
    const target = selected;
    setBusy(true); setError('');
    try {
      if (target) await write(`${base}${target}/messages/`, { body: draft.trim() });
      else {
        const created: Conversation = await write(base, {
          subject: subject.trim(), body: draft.trim(),
          quote_reference: chosenContext?.kind === 'quote' ? chosenContext.reference : '',
          order_reference: chosenContext?.kind === 'order' ? chosenContext.reference : '',
          invoice_reference: chosenContext?.kind === 'invoice' ? chosenContext.reference : '',
        });
        if (active.current === null) setSelected(created.id);
        setSubject('');
      }
      setDrafts((current) => ({ ...current, [String(target ?? 'new')]: '' }));
      setRevision((value) => value + 1);
    } catch (reason) {
      const failure = detail?.channel === 'whatsapp' && reason instanceof Error ? reason.message : 'Não foi possível enviar. Confirme os dados e a ligação e tente novamente.';
      if (target && detail?.channel === 'whatsapp') {
        // Preserve the draft, but show the durable "unconfirmed" record before a retry.
        try {
          const page: Page<Message> = await fetchWithAuth(`${base}${target}/messages/`);
          if (active.current === target) setMessages([...page.results].reverse());
        } catch { /* Keep the original send failure and allow a manual refresh. */ }
      }
      setError(failure);
    }
    finally { setBusy(false); }
  }

  async function loadMore(path: string, kind: 'threads' | 'messages') {
    const target = selected;
    setBusy(true); setError('');
    try {
      // Pagination URLs can contain the backend origin; use the existing same-origin proxy.
      const url = new URL(path, window.location.origin);
      const page = await fetchWithAuth(url.pathname + url.search);
      if (kind === 'threads') {
        setThreads((current) => [...current, ...page.results].filter((row, index, all) => all.findIndex((r) => r.id === row.id) === index));
        setNextThreads(page.next);
      } else if (active.current === target) {
        setMessages((current) => [...(page.results as Message[]).reverse(), ...current].filter((row, index, all) => all.findIndex((r) => r.id === row.id) === index));
        setOlder(page.next);
      }
    } catch { setError('Não foi possível carregar mais resultados.'); }
    finally { setBusy(false); }
  }

  async function resolve() {
    if (!selected) return;
    setBusy(true); setError('');
    try { await write(`${base}${selected}/resolve/`, {}); setRevision((value) => value + 1); }
    catch { setError('Não foi possível concluir a conversa.'); }
    finally { setBusy(false); }
  }

  const context = detail?.context === undefined ? detail?.order_reference || detail?.quote_reference : '';
  const contextHref = detail?.order_reference
    ? `${staff ? '/admin' : '/area-cliente'}/encomendas/${encodeURIComponent(detail.order_reference)}`
    : `${staff ? '/admin' : '/area-cliente'}/orcamentos/${encodeURIComponent(detail?.quote_reference || '')}`;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2 text-brand-800"><Headphones className="h-5 w-5" /><h2 className="text-2xl font-semibold">{staff ? 'Mensagens e apoio' : 'Falar com a MP'}</h2></div>
          <p className="mt-2 text-sm text-slate-600">{staff ? 'Uma caixa de entrada para acompanhar e responder aos clientes.' : 'Deixe a sua questão. A Recepção responderá por aqui; não é um chat instantâneo.'}</p></div>
        <button type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" />Atualizar</button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[320px_1fr]">
        <aside className="border-b p-4 lg:border-b-0 lg:border-r" aria-label="Conversas">
          {!staff && <button type="button" disabled={busy} onClick={() => setSelected(null)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-800 p-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Nova conversa</button>}
          {loading && <p className="text-sm text-slate-500">A carregar conversas…</p>}
          {!loading && !threads.length && <p className="text-sm text-slate-500">Ainda não há conversas.</p>}
          <div className="max-h-[520px] space-y-2 overflow-y-auto">{threads.map((thread) => (
            <button key={thread.id} type="button" disabled={busy} onClick={() => setSelected(thread.id)} aria-pressed={selected === thread.id} className={`w-full rounded-xl border p-3 text-left ${selected === thread.id ? 'border-brand-300 bg-brand-50' : 'border-transparent hover:bg-slate-50'}`}>
              {staff && <p className="text-xs font-semibold text-brand-700">{thread.client_name}</p>}
              {thread.channel === 'whatsapp' ? <span className="text-xs font-semibold text-brand-700">WhatsApp</span> : null}
              <p className="text-sm font-semibold">{thread.subject}</p><p className="mt-1 text-xs text-slate-500">{statuses[thread.status]}{thread.unread_count > 0 ? ` · ${thread.unread_count} por ler` : ''}</p>
            </button>))}</div>
          {nextThreads && <button type="button" disabled={busy} onClick={() => loadMore(nextThreads, 'threads')} className="mt-3 text-sm text-brand-800">Mais conversas</button>}
        </aside>
        <div className="min-w-0 p-4 sm:p-6">
          {selected ? <>
            {!detail ? <p className="text-sm text-slate-500">A abrir conversa…</p> : <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><h3 className="font-semibold">{detail.subject}</h3><p className="mt-1 text-xs text-slate-500">{statuses[detail.status]}</p>{context && <Link href={contextHref} className="mt-2 inline-block text-sm text-brand-700">Ver pedido / projeto: {context}</Link>}</div>
                {staff && detail.status !== 'resolved' && <button type="button" disabled={busy} onClick={resolve} className="rounded-lg border px-3 py-2 text-xs">Marcar como resolvida</button>}</div>
              {detail.context ? <SupportContextCard context={detail.context} staff={staff} /> : null}
              {staff && detail.whatsapp && !detail.whatsapp.can_reply ? <div className="my-3 rounded-xl bg-amber-50 p-4 text-sm"><p>A resposta livre pela API está indisponível: a janela de 24 horas terminou ou a integração está desativada. Uma resposta enviada pela empresa não reabre essa janela.</p>{detail.whatsapp.coexistence ? <a href={`https://wa.me/${detail.whatsapp.phone}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-brand-800">Abrir conversa no WhatsApp Business →</a> : <p className="mt-2">Use um template aprovado no editor abaixo, com a integração ativa.</p>}</div> : null}
              <div className="my-4 max-h-[460px] space-y-4 overflow-y-auto" aria-label="Histórico de mensagens">
                {older && <button type="button" disabled={busy} onClick={() => loadMore(older, 'messages')} className="text-sm text-brand-800">Mensagens anteriores</button>}
                {messages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-2xl p-4 ${message.is_staff === staff ? 'ml-auto bg-brand-50' : 'bg-slate-100'}`}><p className="text-xs font-semibold text-brand-800">{message.is_staff ? 'Equipa MP' : detail.client_name}{message.source === 'whatsapp_app' ? ' · telefone' : ''}</p>{message.template ? <p className="mt-1 text-xs text-brand-700">Template: {message.template.name} · {message.template.language}</p> : null}<p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</p>{staff && message.attachment ? <WhatsAppAttachment conversationId={detail.id} messageId={message.id} file={message.attachment} /> : null}{message.delivery_status === 'unconfirmed' || message.delivery_status === 'failed' ? <p className="mt-2 text-xs text-amber-800">Envio {message.delivery_status === 'failed' ? 'falhou' : 'não confirmado — verifique no telefone antes de reenviar'}.</p> : null}<time className="mt-2 block text-[11px] text-slate-500" dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('pt-MZ')}</time></div>)}
              </div>
              {staff && detail.channel === 'whatsapp' ? <WhatsAppTemplateComposer key={detail.id} conversationId={detail.id} onSending={setBusy} onSent={() => setRevision((value) => value + 1)} onFailed={() => {
                const target = detail.id;
                void fetchWithAuth(`${base}${target}/messages/`).then((page: Page<Message>) => {
                  if (active.current === target) setMessages([...page.results].reverse());
                }).catch(() => { /* Keep the send error and let reception refresh manually. */ });
              }} /> : null}
              {detail.status === 'resolved' && <p className="mb-3 text-xs text-slate-500">Enviar uma mensagem reabre esta conversa.</p>}
            </>}
          </> : staff ? <p className="py-20 text-center text-slate-500">Abra uma conversa para responder.</p> : <div className="mb-5"><h3 className="text-lg font-semibold">Como podemos ajudar?</h3><p className="mt-2 text-sm text-slate-500">As mensagens ficam guardadas na sua conta.</p></div>}
          {(!staff || selected) && (!selected || detail) && <form onSubmit={send} className="space-y-3">
            {!selected ? <fieldset disabled={busy}><SupportContextPicker key={`${quote}:${order}:${invoice}`} initial={initialContext} onChange={setChosenContext} onReady={setContextReady} /></fieldset> : null}
            {!selected && <label className="block text-sm font-medium">Assunto<input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="Ex.: Uma dúvida sobre a minha proposta" /></label>}
            <label className="block text-sm font-medium">Mensagem<textarea required maxLength={4000} rows={4} value={draft} disabled={busy} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full resize-y rounded-xl border p-3" placeholder="Explique a sua questão…" /></label>
            <button disabled={busy || !draft.trim() || (staff && Boolean(detail?.whatsapp) && !detail?.whatsapp?.can_reply) || (!selected && (!subject.trim() || !contextReady))} className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{busy ? 'A enviar…' : 'Enviar mensagem'}</button>
          </form>}
        </div>
      </div>
    </section>
  );
}
