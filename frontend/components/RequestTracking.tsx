'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, LockKeyhole, MessageCircle, Package, RefreshCw, Send } from 'lucide-react';

type Tracking = { reference: string; order_reference: string | null; title: string; step: number | null; status: string; next_action: string; scheduled_date: string | null };
type Message = { id: number; body: string; is_staff: boolean; created_at: string };
const steps = ['Recebido', 'Em análise', 'Proposta', 'Produção', 'Pronto', 'Entregue'];

async function trackingRequest<T>(path: string, token: string, body?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/tracking/${path}/`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', 'X-MP-Tracking-Token': token },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'Link inválido ou expirado. Solicite um novo link abaixo.' : response.status === 429 ? 'Demasiados pedidos. Aguarde alguns minutos e tente novamente.' : 'Não foi possível contactar a MP. Tente novamente.');
  return response.json();
}

export function RequestTracking() {
  const [token, setToken] = useState('');
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState(false);
  const [draft, setDraft] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    if (incoming) {
      try { sessionStorage.setItem('mp-tracking-v1', incoming); } catch { /* Storage may be disabled. */ }
      window.history.replaceState(null, '', window.location.pathname);
    }
    let saved = '';
    try { saved = sessionStorage.getItem('mp-tracking-v1') || ''; } catch { /* Keep memory-only access. */ }
    setToken(incoming || saved);
  }, []);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setBusy(true); setError('');
    trackingRequest<Tracking>('detail', token, undefined, controller.signal).then(setTracking).catch((reason) => { if (!controller.signal.aborted) { setTracking(null); setError(reason.message); } }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [token, revision]);
  useEffect(() => {
    if (!token || !tracking || !chat) return;
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      trackingRequest<{ messages: Message[] }>('messages', token, undefined, controller.signal).then((data) => setMessages(data.messages)).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); });
    };
    refresh(); const timer = window.setInterval(refresh, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [token, tracking, chat]);
  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setBusy(true); setNotice(''); setError('');
    try { const result = await trackingRequest<{ detail: string }>('lookup', '', { reference: String(data.get('reference')), email: String(data.get('email')) }); setNotice(result.detail); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o link.'); }
    finally { setBusy(false); }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy || !draft.trim()) return;
    setBusy(true); setError('');
    try {
      await trackingRequest('messages', token, { body: draft.trim() }); setDraft('');
      const result = await trackingRequest<{ messages: Message[] }>('messages', token); setMessages(result.messages);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar.'); }
    finally { setBusy(false); }
  }
  return <section className="bg-[#f5f6f0] py-12 lg:py-16"><div className="mx-auto max-w-5xl px-4">
    <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.2em] text-brand-700">MP · Sempre por perto</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#173f30]">Acompanhe o seu pedido.</h1><p className="mt-3 text-sm text-slate-600">Saiba em que etapa está e fale com a Recepção, sem precisar de criar uma conta.</p></div>
    {error ? <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p> : null}
    {busy ? <p role="status" className="mb-4 text-sm text-slate-500">A contactar a MP…</p> : null}
    {tracking ? <div className="overflow-hidden rounded-2xl border border-[#dce3d3] bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[#173f30] p-6 text-white"><div><p className="text-xs text-white/70">{tracking.reference}{tracking.order_reference ? ` · ${tracking.order_reference}` : ''}</p><h2 className="mt-2 text-xl font-semibold">{tracking.title}</h2></div><span className="rounded-full border border-[#c3a451]/60 px-4 py-2 text-xs font-semibold text-[#ead59a]">{tracking.status}</span></header>
      <div className="p-6"><ol aria-label="Etapas do pedido" className="grid grid-cols-2 gap-3 md:grid-cols-6">{steps.map((label, index) => <li key={label} aria-current={tracking.step === index ? 'step' : undefined} className={`rounded-xl border p-3 text-xs ${tracking.step === index ? 'border-[#c3a451] bg-[#fbf7e9] text-[#173f30]' : 'border-slate-100 text-slate-500'}`}><span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#edf2e8] text-brand-800">{tracking.step !== null && index < tracking.step ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}</span>{label}</li>)}</ol>
        <div className="mt-6 rounded-xl bg-[#f3f6ef] p-5"><p className="text-xs font-semibold uppercase tracking-wider text-brand-800">O próximo passo</p><p className="mt-2 text-sm leading-6 text-[#173f30]">{tracking.next_action}</p>{tracking.scheduled_date ? <p className="mt-3 text-xs font-semibold">Entrega / levantamento agendado: {new Date(tracking.scheduled_date).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo' })}</p> : <p className="mt-3 text-xs text-slate-500">Data de entrega ainda por confirmar com a MP.</p>}</div>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" aria-expanded={chat} disabled={busy} onClick={() => setChat(!chat)} className="inline-flex items-center gap-2 rounded-xl bg-[#173f30] px-4 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" />Falar sobre este pedido</button><button type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"><RefreshCw className="h-4 w-4" />Atualizar estado</button></div>
        {chat ? <section aria-label="Conversa com a Recepção" className="mt-6 border-t pt-5"><h3 className="font-semibold text-[#173f30]">Recepção MP · {tracking.reference}</h3><p className="mt-2 text-xs text-slate-500">A mensagem chega à nossa equipa com este pedido associado. As respostas não são instantâneas.</p><ol aria-live="polite" className="my-5 max-h-80 space-y-3 overflow-y-auto">{messages.length ? messages.map((message) => <li key={message.id} className={`max-w-[90%] rounded-xl p-3 ${message.is_staff ? 'bg-[#edf2e8]' : 'ml-auto bg-[#fbf7e9]'}`}><p className="text-[11px] font-semibold text-brand-800">{message.is_staff ? 'Recepção MP' : 'Você'}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.body}</p><time className="mt-2 block text-[10px] text-slate-500">{new Date(message.created_at).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo' })}</time></li>) : <li className="text-sm text-slate-500">Ainda não há mensagens. Como podemos ajudar?</li>}</ol><form onSubmit={send}><label className="block text-xs font-semibold">A sua mensagem<textarea required maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><button disabled={busy || !draft.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#173f30] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Enviar à Recepção</button></form></section> : null}
      </div></div> : null}
    {!tracking ? <form onSubmit={lookup} className="max-w-xl rounded-2xl border border-[#dce3d3] bg-white p-6 shadow-sm"><LockKeyhole className="mb-3 h-6 w-6 text-brand-800" /><h2 className="text-lg font-semibold text-[#173f30]">Receba o seu link de acompanhamento</h2><p className="mt-2 text-sm leading-6 text-slate-500">Indique a referência e o email utilizado no pedido. Enviaremos o acesso para esse email.</p><label className="mt-5 block text-xs font-semibold">Referência do pedido<input required name="reference" maxLength={30} placeholder="MP-0001-2026" className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="mt-4 block text-xs font-semibold">Email do pedido<input required name="email" type="email" maxLength={254} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><button disabled={busy} className="mt-5 rounded-xl bg-[#173f30] px-4 py-3 text-sm font-semibold text-white">Enviar link seguro</button>{notice ? <p role="status" className="mt-4 text-sm text-brand-800">{notice}</p> : null}</form> : null}
    <aside className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce3d3] p-5"><div className="flex items-center gap-3"><Package className="h-6 w-6 text-brand-800" /><div><h2 className="text-sm font-semibold text-[#173f30]">Todos os seus pedidos, num só lugar.</h2><p className="mt-1 text-xs text-slate-500">Use BrandDesk para gerir a sua empresa, aprovações e histórico.</p></div></div><Link href="/area-cliente/registo" className="text-sm font-semibold text-brand-800 underline">Criar a minha conta</Link></aside>
  </div></section>;
}
