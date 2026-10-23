'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Copy, Download, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';
import { downloadQuotePdf, type AdminQuote } from '@/lib/admin-api';
import { decisionLabels, type ProposalDecision } from '@/lib/proposal-review';
import { ProposalReadView } from './ProposalReadView';

const EmailDesk = dynamic(() => import('./EmailDesk').then((m) => m.EmailDesk));
type Workspace = { version: number; published: boolean; registered: boolean; email: string; phone: string; link: string | null; decision: ProposalDecision | null };

export function ClientProposalWorkspace({ quote, editable, onAcquire, onChanged, onBack, onMessages, onBusyChange, onDirtyChange }: {
  quote: AdminQuote; editable: boolean; onAcquire: () => void; onChanged: () => void; onBack: () => void; onMessages: () => void;
  onBusyChange?: (value: boolean) => void; onDirtyChange?: (value: boolean) => void;
}) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [emailId, setEmailId] = useState<number | null>(null);
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [phoneDecision, setPhoneDecision] = useState('accept');
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    fetchWithAuth(`/api/quotes/${quote.reference}/client-workspace/`).then((value: Workspace) => { if (active) setData(value); })
      .catch(() => { if (active) setError('Não foi possível carregar o envio e a decisão. Tente reabrir o pedido.'); });
    return () => { active = false; };
  }, [quote.reference]);
  async function act(action: 'publish' | 'email' | 'phone') {
    if (!data || busy || !editable) return;
    if (action === 'publish' && !window.confirm('Disponibilizar a versão atual ao cliente? Emails e WhatsApp serão preparados separadamente, sem envio automático.')) return;
    if (action === 'phone' && !window.confirm('Registar esta decisão em nome do cliente? O seu nome ficará associado ao registo.')) return;
    setBusy(true); onBusyChange?.(true); setError('');
    try {
      const result = await fetchWithAuth(`/api/quotes/${quote.reference}/client-workspace/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          action, version: data.version, decision: phoneDecision, contact_name: contact, comment, confirmed,
        }),
      });
      if (action === 'email') { setEmailId(result.conversation_id); setNotice('Rascunho preparado com o PDF. Reveja a assinatura, destinatário e conteúdo antes de enviar.'); }
      else { onDirtyChange?.(false); onChanged(); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  const message = data?.link ? `Olá ${quote.client_company || quote.client_name}, partilhamos a proposta ${quote.reference} (v${data.version}). O PDF segue em anexo. Pode rever as condições, aceitar, pedir alterações ou recusar aqui: ${data.link}\nA aceitação não confirma o início da produção.` : '';
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Copiado.'); } catch { setError('Não foi possível copiar. Selecione e copie o texto manualmente.'); }
  }
  return <section aria-label="Espaço do cliente" className="space-y-5">
    <header className="rounded-2xl bg-[#173f30] p-6 text-white"><p className="text-xs uppercase tracking-[.2em] text-[#d6bd79]">03 · Cliente · {quote.reference}</p><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">Da proposta à decisão.</h2><p className="mt-2 text-sm text-white/70">Uma versão, vários canais, uma decisão no mesmo pedido.</p></div><button onClick={onBack} disabled={busy} className="rounded-xl border border-white/30 px-4 py-2 text-sm">Voltar à proposta</button></div></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl bg-[#f8f3e2] p-4 text-sm">{notice}</p> : null}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0"><ProposalReadView quote={quote} /></div>
      <aside className="space-y-4 rounded-2xl border bg-white p-5">
        <div className="border-b pb-4"><p className="text-xs uppercase tracking-wider text-slate-500">Decisão do cliente</p><h3 className="mt-2 text-lg font-semibold">{data?.decision ? decisionLabels[data.decision.client_decision] : data?.published ? 'A aguardar o cliente' : 'Pronta para partilhar'}</h3>{data?.decision ? <p className="mt-2 text-xs text-slate-500">{data.decision.contact_name || 'Cliente'} · {data.decision.channel === 'phone' ? 'Registada pela Recepção por telefone' : data.decision.channel === 'branddesk' ? 'BrandDesk' : 'Link privado'}</p> : null}</div>
        {!data ? <p role="status">A carregar os canais…</p> : <>
          <dl className="space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Cliente</dt><dd>{quote.client_company || quote.client_name}</dd></div><div><dt className="text-xs text-slate-500">Email de destino</dt><dd className="break-all">{data.email || 'Por confirmar no pedido'}</dd></div><div><dt className="text-xs text-slate-500">WhatsApp</dt><dd>{data.phone || 'Por confirmar no pedido'}</dd></div></dl>
          {!editable && !data.decision ? <button onClick={onAcquire} className="w-full rounded-xl border px-4 py-3 text-sm font-semibold">Reservar edição para enviar / registar</button> : null}
          {!data.published ? <><p className="text-xs leading-5 text-slate-500">Disponibilize primeiro a versão atual. {data.registered ? 'Ficará visível no BrandDesk deste cliente.' : 'O cliente poderá responder pelo link privado, sem conta.'}</p><button disabled={!editable || busy || quote.final_price == null} onClick={() => act('publish')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f30] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Disponibilizar proposta</button></> : <>
            <div className="rounded-xl bg-[#f2f5ee] p-4 text-xs leading-5">{data.registered ? 'Disponível no BrandDesk do cliente.' : 'Cliente sem conta: aprovação disponível por link privado.'} O registo é opcional. Links são privados, válidos até 7 dias e deixam de funcionar após uma revisão.</div>
            {data.link ? <div><label className="text-xs font-semibold" htmlFor="proposal-private-link">Link de apreciação</label><input id="proposal-private-link" readOnly value={data.link} className="mt-2 w-full rounded-lg border p-2 text-xs" /><button onClick={() => copy(data.link!)} className="mt-2 flex items-center gap-2 text-xs font-semibold"><Copy className="h-3 w-3" />Copiar link privado</button></div> : null}
            {!data.decision ? <>
              <button disabled={!editable || busy || !data.email} onClick={() => act('email')} className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-50"><Mail className="h-4 w-4" />Preparar email com PDF</button>
              <details className="rounded-xl border p-4"><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4" />Preparar WhatsApp</summary><p className="mt-3 text-xs leading-5 text-slate-500">Confirme o número com o cliente. Descarregue o PDF e anexe-o na conversa; abrir WhatsApp não envia nem anexa o documento automaticamente.</p><textarea aria-label="Mensagem de WhatsApp" value={message} readOnly rows={6} className="mt-3 w-full rounded-lg border p-2 text-xs" /><div className="mt-3 flex flex-wrap gap-3 text-xs"><button onClick={() => copy(message)} className="font-semibold underline">Copiar mensagem</button>{/^\+?\d[\d\s()-]{7,19}$/.test(data.phone) ? <a href={`https://wa.me/${data.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="font-semibold underline">Abrir WhatsApp</a> : <span>Confirme o indicativo e o número.</span>}</div></details>
              <button disabled={!editable || busy} onClick={() => setPhoneOpen(!phoneOpen)} aria-expanded={phoneOpen} className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-50"><Phone className="h-4 w-4" />Registar decisão por telefone</button>
            </> : null}
          </>}
          <button disabled={busy} onClick={() => downloadQuotePdf(quote.reference).catch(() => setError('PDF indisponível.'))} className="flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4" />Descarregar PDF</button>
          <button disabled={busy} onClick={onMessages} className="text-sm font-semibold underline">Mensagens do pedido</button>
        </>}
      </aside>
    </div>
    {phoneOpen && !data?.decision ? <form onSubmit={(e) => { e.preventDefault(); void act('phone'); }} onChange={() => onDirtyChange?.(true)} className="space-y-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Decisão comunicada por telefone</h3><fieldset disabled={!editable || busy} className="space-y-4"><label className="block text-sm">Nome do contacto<input required value={contact} onChange={(e) => setContact(e.target.value)} maxLength={160} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="block text-sm">Decisão<select value={phoneDecision} onChange={(e) => setPhoneDecision(e.target.value)} className="ml-3 rounded-lg border p-2"><option value="accept">Aceitar</option><option value="changes">Pedir alterações</option><option value="decline">Recusar</option></select></label><label className="block text-sm">Contexto e confirmação obtida<textarea required value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={3000} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Confirmo que este contacto comunicou esta decisão para a versão atual.</label><button disabled={!confirmed} className="rounded-xl bg-[#173f30] px-4 py-3 text-sm text-white disabled:opacity-50">Registar decisão do cliente</button></fieldset></form> : null}
    {emailId ? <section className="space-y-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Email preparado · atendimento</h3><EmailDesk initialConversation={emailId} quoteReference={quote.reference} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange} /></section> : null}
  </section>;
}
