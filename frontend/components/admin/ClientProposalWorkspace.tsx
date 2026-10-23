'use client';

import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { Copy, Download, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';
import { downloadQuotePdf, type AdminQuote } from '@/lib/admin-api';
import { decisionLabels, type ProposalDecision } from '@/lib/proposal-review';
import { ProposalReadView } from './ProposalReadView';

const EmailDesk = dynamic(() => import('./EmailDesk').then((m) => m.EmailDesk));
type Channel = { state: string; at?: string | null; actor?: string | null; conversation_id?: number | null };
type Workspace = { reference?: string; version: number; published: boolean; registered: boolean; email: string; phone: string; whatsapp_number?: string; link: string | null; decision: ProposalDecision | null;
  state?: string; expired?: boolean; published_at?: string; channels?: { branddesk: Channel; email: Channel; whatsapp: Channel };
  follow_up?: { date: string | null; note: string }; history?: { action: string; version: number; at: string; actor: string; comment?: string }[] };
const channelLabels: Record<string, string> = { available: 'Disponível no BrandDesk', not_available: 'Não disponível no BrandDesk', not_prepared: 'Email por preparar', draft: 'Rascunho — ainda não enviado', accepted: 'Email aceite pelo Zoho', unconfirmed: 'Envio por confirmar — verificar no Zoho', failed: 'Envio falhou', confirmed: 'Envio confirmado pela Recepção', not_sent: 'Ainda sem envio registado' };
const nextActions: Record<string, [string, string]> = {
  draft: ['Disponibilizar a versão atual', 'Reveja a proposta e disponibilize-a antes de escolher o canal de envio.'],
  not_sent: ['Enviar a proposta', 'O link está disponível, mas ainda não há um envio registado. Prepare o email ou partilhe por WhatsApp.'],
  awaiting_response: ['Acompanhar a decisão', 'Verifique os últimos envios e agende o próximo contacto. Disponibilidade não confirma leitura.'],
  accepted: ['Confirmar os próximos passos com o cliente', 'Aceitação registada. Pagamento e autorização de produção são etapas separadas.'],
  changes: ['Rever a proposta', 'Consulte o pedido de alterações e prepare uma nova versão. Os links anteriores deixam de ser válidos.'],
  decline: ['Rever o motivo da recusa', 'Consulte a decisão e alinhe o seguimento com o cliente, sem iniciar produção.'],
  expired: ['Atualizar a proposta expirada', 'Reveja a validade e as condições antes de voltar a solicitar uma decisão.'],
};
const dateTime = (value: string) => new Date(value).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo', dateStyle: 'short', timeStyle: 'short' });

function ClientProposalWorkspaceContent({ quote, editable, onAcquire, onChanged, onBack, onMessages, onBusyChange, onDirtyChange: notifyDirtyParent }: {
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
  const [refresh, setRefresh] = useState(0);
  const [dirtyFields, setDirtyFields] = useState({ phone: false, whatsapp: false, follow_up: false, email: false });
  const dirty = Object.values(dirtyFields).some(Boolean);
  useEffect(() => { notifyDirtyParent?.(dirty); }, [dirty, notifyDirtyParent]);
  const onDirtyChange = (value: boolean) => setDirtyFields((previous) => ({ ...previous, phone: value }));
  const emailDirtyChange = useCallback((value: boolean) => setDirtyFields((previous) => ({ ...previous, email: value })), []);
  const refreshChannels = useCallback(() => setRefresh((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setError('');
    fetchWithAuth(`/api/quotes/${quote.reference}/client-workspace/`).then((value: Workspace) => { if (active) setData(value); })
      .catch(() => { if (active) setError('Não foi possível carregar o envio e a decisão. Tente reabrir o pedido.'); });
    return () => { active = false; };
  }, [quote.reference, quote.proposal_workflow?.version, quote.proposal_workflow?.stage, refresh]);
  async function act(action: 'publish' | 'email' | 'phone' | 'whatsapp' | 'follow_up', extra: Record<string, unknown> = {}) {
    if (!data || busy || !editable) return;
    if (action === 'publish' && !window.confirm('Disponibilizar a versão atual ao cliente? Emails e WhatsApp serão preparados separadamente, sem envio automático.')) return;
    if (action === 'phone' && !window.confirm('Registar esta decisão em nome do cliente? O seu nome ficará associado ao registo.')) return;
    setBusy(true); onBusyChange?.(true); setError('');
    try {
      const result = await fetchWithAuth(`/api/quotes/${quote.reference}/client-workspace/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          action, version: data.version, decision: phoneDecision, contact_name: contact, comment, confirmed, ...extra,
        }),
      });
      if (action === 'email') { setEmailId(result.conversation_id); refreshChannels(); setNotice('Rascunho preparado com o PDF. Reveja a assinatura, destinatário e conteúdo antes de enviar.'); }
      else {
        if (action === 'phone' || action === 'whatsapp' || action === 'follow_up') setDirtyFields((previous) => ({ ...previous, [action]: false }));
        setData(action === 'publish' ? null : result); onChanged(); refreshChannels();
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  const next = nextActions[data?.state || (data?.published ? 'awaiting_response' : 'draft')] || nextActions.draft;
  const message = data?.link ? `Olá ${quote.client_company || quote.client_name}, partilhamos a proposta ${quote.reference} (v${data.version}). O PDF segue em anexo. Pode rever as condições, aceitar, pedir alterações ou recusar aqui: ${data.link}\nA aceitação não confirma o início da produção.` : '';
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Copiado.'); } catch { setError('Não foi possível copiar. Selecione e copie o texto manualmente.'); }
  }
  return <section aria-label="Espaço do cliente" className="space-y-5">
    <header className="rounded-2xl bg-[#173f30] p-6 text-white"><p className="text-xs uppercase tracking-[.2em] text-[#d6bd79]">03 · Cliente · {quote.reference}</p><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">Da proposta à decisão.</h2><p className="mt-2 text-sm text-white/70">Uma versão, vários canais, uma decisão no mesmo pedido.</p></div><button onClick={onBack} disabled={busy} className="rounded-xl border border-white/30 px-4 py-2 text-sm">Voltar à proposta</button></div></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl bg-[#f8f3e2] p-4 text-sm">{notice}</p> : null}
    {data ? <section aria-label="Próxima ação do cliente" className="rounded-2xl border border-[#d9c58b] bg-[#faf7ec] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-widest text-[#92763f]">Versão {data.version} · Próxima ação</p><button type="button" disabled={busy} onClick={refreshChannels} className="text-xs font-semibold underline">Atualizar estado</button></div><h3 className="mt-2 text-lg font-semibold text-[#173f30]">{next[0]}</h3><p className="mt-2 text-sm text-slate-600">{next[1]}</p>{data.follow_up?.date ? <p className="mt-3 text-sm font-medium">Seguimento: {new Date(`${data.follow_up.date}T00:00:00`).toLocaleDateString('pt-MZ')} · {data.follow_up.note}</p> : null}</section> : null}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0"><ProposalReadView quote={quote} /></div>
      <aside className="space-y-4 rounded-2xl border bg-white p-5">
        <div className="border-b pb-4"><p className="text-xs uppercase tracking-wider text-slate-500">Decisão do cliente</p><h3 className="mt-2 text-lg font-semibold">{data?.decision ? decisionLabels[data.decision.client_decision] : data?.state === 'not_sent' ? 'Por enviar ao cliente' : data?.published ? 'A aguardar o cliente' : 'Pronta para partilhar'}</h3>{data?.decision ? <p className="mt-2 text-xs text-slate-500">{data.decision.contact_name || 'Cliente'} · {data.decision.channel === 'phone' ? 'Registada pela Recepção por telefone' : data.decision.channel === 'branddesk' ? 'BrandDesk' : 'Link privado'} · {dateTime(data.decision.at)}</p> : null}{data?.decision?.comment ? <p className="mt-3 whitespace-pre-wrap text-sm">{data.decision.comment}</p> : null}</div>
        {!data ? <p role="status">A carregar os canais…</p> : <>
          <dl className="space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Cliente</dt><dd>{quote.client_company || quote.client_name}</dd></div><div><dt className="text-xs text-slate-500">Email de destino</dt><dd className="break-all">{data.email || 'Por confirmar no pedido'}</dd></div><div><dt className="text-xs text-slate-500">WhatsApp</dt><dd>{data.phone || 'Por confirmar no pedido'}</dd></div></dl>
          {data.channels ? <dl aria-label="Estado dos canais" className="space-y-3 rounded-xl bg-slate-50 p-3 text-xs">{(['branddesk', 'email', 'whatsapp'] as const).map((channel) => <div key={channel}><dt className="font-semibold">{{ branddesk: 'BrandDesk', email: 'Email', whatsapp: 'WhatsApp' }[channel]}</dt><dd className="mt-1 text-slate-600">{channelLabels[data.channels![channel].state] || 'Por verificar'}{data.channels![channel].at ? ` · ${dateTime(data.channels![channel].at!)}` : ''}{data.channels![channel].actor ? ` · ${data.channels![channel].actor}` : ''}</dd></div>)}</dl> : null}
          {!editable && !data.decision ? <button onClick={onAcquire} className="w-full rounded-xl border px-4 py-3 text-sm font-semibold">Reservar edição para enviar / registar</button> : null}
          {!data.published ? <><p className="text-xs leading-5 text-slate-500">Disponibilize primeiro a versão atual. {data.registered ? 'Ficará visível no BrandDesk deste cliente.' : 'O cliente poderá responder pelo link privado, sem conta.'}</p><button disabled={!editable || busy || quote.final_price == null} onClick={() => act('publish')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f30] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Disponibilizar proposta</button></> : <>
            <div className="rounded-xl bg-[#f2f5ee] p-4 text-xs leading-5">{data.registered ? 'Disponível no BrandDesk do cliente.' : 'Cliente sem conta: aprovação disponível por link privado.'} O registo é opcional. Links são privados, válidos até 7 dias e deixam de funcionar após uma revisão.</div>
            {data.link ? <div><label className="text-xs font-semibold" htmlFor="proposal-private-link">Link de apreciação</label><input id="proposal-private-link" readOnly value={data.link} className="mt-2 w-full rounded-lg border p-2 text-xs" /><button onClick={() => copy(data.link!)} className="mt-2 flex items-center gap-2 text-xs font-semibold"><Copy className="h-3 w-3" />Copiar link privado</button></div> : null}
            {!data.decision && !data.expired ? <>
              <button disabled={!editable || busy || !data.email} onClick={() => act('email')} className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-50"><Mail className="h-4 w-4" />Preparar email com PDF</button>
              <details className="rounded-xl border p-4">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4" />Preparar WhatsApp</summary>
                <p className="mt-3 text-xs leading-5 text-slate-500">Confirme o número com o cliente. Descarregue o PDF e anexe-o na conversa; abrir WhatsApp não envia nem anexa o documento automaticamente.</p>
                <textarea aria-label="Mensagem de WhatsApp" value={message} readOnly rows={6} className="mt-3 w-full rounded-lg border p-2 text-xs" />
                <div className="mt-3 flex flex-wrap gap-3 text-xs"><button onClick={() => copy(message)} className="font-semibold underline">Copiar mensagem</button>{data.whatsapp_number ? <a href={`https://wa.me/${data.whatsapp_number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="font-semibold underline">Abrir WhatsApp</a> : <span>Confirme o indicativo e o número.</span>}</div>
                <form onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void act('whatsapp', { confirmed: fields.get('sent') === 'on', comment: fields.get('context') }); }} onChange={() => setDirtyFields((previous) => ({ ...previous, whatsapp: true }))} className="mt-4 space-y-3 border-t pt-3">
                  <fieldset disabled={!editable || busy || !data.whatsapp_number} className="space-y-3">
                    <label className="block text-xs">Registo do envio<input required name="context" maxLength={500} placeholder="Contacto e contexto do envio" className="mt-2 w-full rounded-lg border p-2" /></label>
                    <label className="flex items-start gap-2 text-xs"><input required type="checkbox" name="sent" />Confirmo que enviei a mensagem, o PDF e o link desta versão ao número indicado.</label>
                    <button className="rounded-lg border px-3 py-2 text-xs font-semibold">Registar envio por WhatsApp</button>
                  </fieldset>
                </form>
              </details>
              <button disabled={!editable || busy} onClick={() => setPhoneOpen(!phoneOpen)} aria-expanded={phoneOpen} className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-50"><Phone className="h-4 w-4" />Registar decisão por telefone</button>
            </> : null}
          </>}
          <button disabled={busy} onClick={() => downloadQuotePdf(quote.reference).catch(() => setError('PDF indisponível.'))} className="flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4" />Descarregar PDF</button>
          <button disabled={busy} onClick={onMessages} className="text-sm font-semibold underline">Mensagens do pedido</button>
          {data.channels?.email.conversation_id ? <button disabled={busy} onClick={() => setEmailId(data.channels!.email.conversation_id!)} className="text-sm font-semibold underline">Abrir histórico do email</button> : null}
        </>}
      </aside>
    </div>
    {data ? <div className="grid items-start gap-5 lg:grid-cols-2">
      <form aria-label="Agendar seguimento" key={`${data.follow_up?.date}:${data.follow_up?.note}`} onChange={() => setDirtyFields((previous) => ({ ...previous, follow_up: true }))} onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); void act('follow_up', { date: fields.get('date') || null, comment: fields.get('note') || '' }); }} className="space-y-4 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold text-[#173f30]">Próximo contacto</h3><p className="text-xs text-slate-500">O seguimento fica também na agenda partilhada da Recepção.</p>
        <fieldset disabled={!editable || busy} className="space-y-3"><label className="block text-sm">Data do seguimento<input name="date" type="date" defaultValue={data.follow_up?.date || ''} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="block text-sm">Objetivo do contacto<textarea name="note" rows={2} maxLength={500} defaultValue={data.follow_up?.note || ''} className="mt-2 block w-full rounded-xl border p-3" /></label><button className="rounded-xl border px-4 py-2 text-sm font-semibold">Guardar seguimento</button></fieldset>
      </form>
      <section aria-label="Histórico de versões e decisões" className="rounded-2xl border bg-white p-5"><h3 className="font-semibold text-[#173f30]">Versões e decisões</h3><p className="mt-2 text-xs text-slate-500">Cada envio e decisão mantém a versão e o responsável. Copiar ou abrir um link não confirma o envio.</p><ol className="mt-4 space-y-4">{data.history?.length ? [...data.history].reverse().map((entry, index) => <li key={`${entry.at}:${index}`} className="border-l-2 border-[#d9c58b] pl-3 text-sm"><p className="font-medium">v{entry.version} · {entry.action}</p><p className="mt-1 text-xs text-slate-500">{dateTime(entry.at)} · {entry.actor || 'Cliente'}</p>{entry.comment ? <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{entry.comment}</p> : null}</li>) : <li className="text-sm text-slate-500">Sem movimentos registados nesta proposta.</li>}</ol></section>
    </div> : null}
    {phoneOpen && !data?.decision ? <form onSubmit={(e) => { e.preventDefault(); void act('phone'); }} onChange={() => onDirtyChange?.(true)} className="space-y-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Decisão comunicada por telefone</h3><fieldset disabled={!editable || busy} className="space-y-4"><label className="block text-sm">Nome do contacto<input required value={contact} onChange={(e) => setContact(e.target.value)} maxLength={160} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="block text-sm">Decisão<select value={phoneDecision} onChange={(e) => setPhoneDecision(e.target.value)} className="ml-3 rounded-lg border p-2"><option value="accept">Aceitar</option><option value="changes">Pedir alterações</option><option value="decline">Recusar</option></select></label><label className="block text-sm">Contexto e confirmação obtida<textarea required value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={3000} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Confirmo que este contacto comunicou esta decisão para a versão atual.</label><button disabled={!confirmed} className="rounded-xl bg-[#173f30] px-4 py-3 text-sm text-white disabled:opacity-50">Registar decisão do cliente</button></fieldset></form> : null}
    {emailId ? <section className="space-y-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Email preparado · atendimento</h3><EmailDesk initialConversation={emailId} quoteReference={quote.reference} onDirtyChange={emailDirtyChange} onBusyChange={onBusyChange} onChanged={refreshChannels} /></section> : null}
  </section>;
}

export function ClientProposalWorkspace(props: ComponentProps<typeof ClientProposalWorkspaceContent>) {
  return <ClientProposalWorkspaceContent key={props.quote.reference} {...props} />;
}
