'use client';

import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CalendarClock, Copy, Download, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';
import { downloadQuotePdf, type AdminQuote } from '@/lib/admin-api';
import { decisionLabels, type ProposalDecision } from '@/lib/proposal-review';
import { proposalWhatsAppMessage } from '@/lib/proposal-whatsapp';

const EmailDesk = dynamic(() => import('./EmailDesk').then((m) => m.EmailDesk));
type Channel = { state: string; at?: string | null; actor?: string | null; conversation_id?: number | null };
type Workspace = { reference?: string; version: number; published: boolean; registered: boolean; email: string; phone: string; whatsapp_number?: string; link: string | null; decision: ProposalDecision | null;
  state?: string; expired?: boolean; published_at?: string; order_reference?: string | null; channels?: { branddesk: Channel; email: Channel; whatsapp: Channel };
  follow_up?: { date: string | null; note: string }; history?: { action: string; version: number; at: string; actor: string; comment?: string }[] };
const channelLabels: Record<string, string> = { available: 'Disponível no BrandDesk', not_available: 'Não disponível no BrandDesk', not_prepared: 'Email por preparar', draft: 'Rascunho — ainda não enviado', accepted: 'Email aceite pelo Zoho', unconfirmed: 'Envio por confirmar — verificar no Zoho', failed: 'Envio falhou', confirmed: 'Envio confirmado pela Recepção', not_sent: 'Ainda sem envio registado' };
const nextActions: Record<string, [string, string]> = {
  draft: ['Disponibilizar a versão atual', 'Reveja a proposta e disponibilize-a antes de escolher o canal de envio.'],
  not_sent: ['Enviar a proposta', 'O link está disponível, mas ainda não há um envio registado. Prepare o email ou partilhe por WhatsApp.'],
  awaiting_response: ['Obter a decisão do cliente', 'Contacte o cliente, esclareça dúvidas e registe a decisão. Envio não confirma leitura nem aceitação.'],
  accepted: ['Operação autorizada', 'A aceitação criou a ordem de trabalho. A equipa pode avançar com as aprovações técnicas necessárias; o pagamento continua separado.'],
  changes: ['Rever a proposta', 'Consulte o pedido de alterações e prepare uma nova versão. Os links anteriores deixam de ser válidos.'],
  decline: ['Rever o motivo da recusa', 'Consulte a decisão e alinhe o seguimento com o cliente, sem iniciar produção.'],
  expired: ['Atualizar a proposta expirada', 'Reveja a validade e as condições antes de voltar a solicitar uma decisão.'],
};
const dateTime = (value: string) => new Date(value).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo', dateStyle: 'short', timeStyle: 'short' });

function ClientProposalWorkspaceContent({ quote, editable, onAcquire, onChanged, onBack, onMessages, onFollowUps, onBusyChange, onDirtyChange: notifyDirtyParent, embedded = false, summary = false }: {
  quote: AdminQuote; editable: boolean; onAcquire: () => void; onChanged: () => void; onBack: () => void; onMessages: () => void;
  onBusyChange?: (value: boolean) => void; onDirtyChange?: (value: boolean) => void; embedded?: boolean; summary?: boolean; onFollowUps?: () => void;
}) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailId, setEmailId] = useState<number | null>(null);
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [phoneDecision, setPhoneDecision] = useState('accept');
  const [confirmed, setConfirmed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [tool, setTool] = useState<'send' | 'contact' | 'decision' | null>(null);
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
    if (action === 'phone' && !window.confirm(phoneDecision === 'accept' ? 'Confirmar aceitação e autorizar a operação? A ordem será criada automaticamente e o seu nome ficará registado.' : 'Registar esta decisão em nome do cliente? O seu nome ficará associado ao registo.')) return;
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
        setData(action === 'publish' ? null : result); if (action === 'publish' || action === 'phone') onChanged(); refreshChannels();
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  const next = nextActions[data?.state || (data?.published ? 'awaiting_response' : 'draft')] || nextActions.draft;
  const message = data?.link ? proposalWhatsAppMessage(quote.client_company || quote.client_name, quote.reference, data.link) : '';
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Copiado.'); } catch { setError('Não foi possível copiar. Selecione e copie o texto manualmente.'); }
  }
  const activeTool = tool || (data?.state === 'awaiting_response' ? 'contact' : 'send');
  const actionable = data?.published && !data.decision && !data.expired;
  function chooseTool(value: 'send' | 'contact' | 'decision') {
    if (value === activeTool) return;
    if (busy || (dirty && !window.confirm('Existem alterações por guardar. Mudar de ação sem guardar?'))) return;
    setDirtyFields({ phone: false, whatsapp: false, follow_up: false, email: false });
    setContact(''); setComment(''); setConfirmed(false); setEmailId(null); setTool(value);
  }
  if (summary) return <section aria-label="Resumo da decisão" className="space-y-4 rounded-2xl border bg-white p-5">
    <h3 className="font-semibold">Proposta e decisão do cliente</h3>
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">A carregar o resumo…</p> : <>
      <p className="text-sm">Versão {data.version} · {data.decision ? decisionLabels[data.decision.client_decision] : data.published ? 'Disponibilizada ao cliente — decisão pendente' : 'Por disponibilizar'}</p>
      {data.decision ? <p className="text-xs text-slate-500">{data.decision.contact_name || 'Cliente'} · {data.decision.channel} · {dateTime(data.decision.at)}</p> : null}
      {data.decision?.comment ? <p className="whitespace-pre-wrap text-sm">{data.decision.comment}</p> : null}
      {data.order_reference ? <p className="text-sm font-semibold">Operação autorizada · {data.order_reference}</p> : null}
      {data.channels ? <dl aria-label="Estado dos canais" className="space-y-3 border-t pt-4 text-xs">{(['branddesk', 'email', 'whatsapp'] as const).map((channel) => <div key={channel}><dt className="font-semibold">{{ branddesk: 'BrandDesk', email: 'Email', whatsapp: 'WhatsApp' }[channel]}</dt><dd className="mt-1 text-slate-600">{channelLabels[data.channels![channel].state] || 'Por verificar'}{data.channels![channel].at ? ` · ${dateTime(data.channels![channel].at!)}` : ''}{data.channels![channel].actor ? ` · ${data.channels![channel].actor}` : ''}</dd></div>)}</dl> : null}
    </>}
  </section>;
  return <section aria-label="Espaço do cliente" className="space-y-5">
    {!embedded ? <header><p className="text-xs uppercase tracking-widest text-[#96773a]">03 · Decisão do cliente · {quote.reference}</p><h2 className="mt-2 text-2xl font-semibold">Da proposta à operação.</h2></header> : null}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl bg-[#f8f3e2] p-4 text-sm">{notice}</p> : null}
    {!data ? <p role="status">A carregar as ações…</p> : <>
      <section aria-label="Próxima ação do cliente" className="rounded-2xl border border-[#d9c58b] bg-[#faf7ec] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-[#92763f]">Objetivo · Obter uma decisão · v{data.version}</p><button type="button" disabled={busy || dirty} onClick={() => { refreshChannels(); onChanged(); }} className="text-xs font-semibold underline disabled:opacity-50">Atualizar estado</button></div>
        <h3 className="mt-3 text-xl font-semibold text-[#173f30]">{next[0]}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{next[1]}</p>
        <p className="mt-3 text-xs font-medium text-[#526447]">Aceitação do cliente → ordem automática → fila de Produção. Não confirma pagamento.</p>
      </section>
      {data.decision || data.expired ? <section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">{data.decision ? decisionLabels[data.decision.client_decision] : 'Proposta expirada'}</h3><p className="mt-2 text-sm text-slate-500">Os detalhes ficam no Resumo e nos Registos do pedido.</p>{data.decision?.client_decision !== 'accept' ? <button type="button" disabled={busy} onClick={onBack} className="desk-primary mt-4 rounded-xl px-4 py-3 text-sm font-semibold text-white">Rever proposta<ArrowRight aria-hidden="true" className="ml-2 inline h-4 w-4" /></button> : <p className="mt-4 text-sm font-semibold">{data.order_reference ? `Ordem ${data.order_reference} autorizada.` : 'Atualize o pedido para consultar a operação.'}</p>}</section> : <>
        {!editable ? <button type="button" disabled={busy} onClick={onAcquire} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">Reservar edição para enviar / registar</button> : null}
        {!data.published ? <section className="rounded-2xl border bg-white p-6"><h3 className="font-semibold">Disponibilizar a proposta</h3><p className="mt-2 text-sm text-slate-500">{data.registered ? 'A versão ficará disponível no BrandDesk.' : 'O cliente poderá decidir por link privado, sem criar conta.'} Não envia mensagens automaticamente.</p><button type="button" disabled={!editable || busy || quote.final_price == null} onClick={() => act('publish')} className="desk-primary mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send aria-hidden="true" className="h-4 w-4" />Disponibilizar proposta</button></section> : <>
          <nav aria-label="Ações para obter a decisão" className="grid gap-2 sm:grid-cols-3">{([{ value: 'send', label: 'Enviar proposta', detail: 'PDF e link de aprovação', Icon: Send }, { value: 'contact', label: 'Contactar cliente', detail: 'Ligar ou preparar lembrete', Icon: Phone }, { value: 'decision', label: 'Registar decisão', detail: 'Confirmação por telefone', Icon: ArrowRight }] as const).map(({ value, label, detail, Icon }) => <button key={value} type="button" disabled={busy} aria-pressed={activeTool === value} onClick={() => chooseTool(value)} className="rounded-xl border bg-white p-4 text-left text-[#173f30] disabled:opacity-50 aria-pressed:border-[#b79950] aria-pressed:bg-[#f5f1e5]"><Icon aria-hidden="true" className="mb-3 h-4 w-4" /><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-slate-500">{detail}</span></button>)}</nav>
          {activeTool === 'send' ? <section aria-label="Enviar proposta ao cliente" className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6"><div><h3 className="font-semibold">Envie a versão atual para decisão</h3><p className="mt-2 text-xs text-slate-500">{data.registered ? 'Também disponível no BrandDesk. ' : ''}Preparar ou abrir uma mensagem não confirma o envio nem a leitura.</p></div>
            <div className="grid items-start gap-4 lg:grid-cols-2"><div className="space-y-4 rounded-xl bg-[#f5f7ef] p-4"><h4 className="text-sm font-semibold">Email · atendimento</h4><p className="break-all text-sm">{data.email || 'Confirme o email no briefing.'}</p><button type="button" disabled={!editable || busy || !data.email} onClick={() => act('email')} className="desk-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Mail aria-hidden="true" className="h-4 w-4" />Preparar email com PDF</button><p className="text-xs text-slate-500">Reveja o modelo, a assinatura e o anexo antes de enviar.</p></div><div><p className="mb-3 text-xs text-slate-500">WhatsApp · {data.phone || 'Confirme o contacto no briefing.'}</p>
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

            </div></div>
            {data.link ? <details className="border-t pt-4"><summary className="cursor-pointer text-xs font-semibold">Partilhar apenas o link privado</summary><label className="mt-3 block text-xs" htmlFor="proposal-private-link">Link de apreciação</label><input id="proposal-private-link" readOnly value={data.link} className="mt-2 w-full rounded-lg border p-2 text-xs" /><button type="button" onClick={() => copy(data.link!)} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold"><Copy aria-hidden="true" className="h-3 w-3" />Copiar link privado</button></details> : null}
            <button type="button" disabled={busy} onClick={() => downloadQuotePdf(quote.reference).catch(() => setError('PDF indisponível.'))} className="inline-flex items-center gap-2 text-xs font-semibold"><Download aria-hidden="true" className="h-4 w-4" />Descarregar PDF para anexar</button>
          </section> : activeTool === 'contact' ? <section aria-label="Contactar cliente" className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6"><div><h3 className="font-semibold">Converse para desbloquear a decisão</h3><p className="mt-2 text-sm text-slate-500">Confirme que recebeu a proposta, esclareça dúvidas e combine uma resposta.</p></div><div className="flex flex-wrap gap-3">{data.phone ? <a href={`tel:${data.phone.replace(/[^+\d]/g, '')}`} className="desk-primary rounded-xl px-4 py-3 text-sm font-semibold text-white">Ligar · {data.phone}</a> : <p className="text-sm">Confirme o telefone no briefing.</p>}<button type="button" disabled={busy} onClick={onMessages} className="rounded-xl border px-4 py-3 text-sm font-semibold">Abrir correspondência</button></div>
            <div className="rounded-xl bg-[#f5f7ef] p-4"><label className="block text-xs font-semibold" htmlFor="decision-reminder">Lembrete para rever e partilhar</label><textarea id="decision-reminder" readOnly rows={4} value={`Olá ${quote.client_company || quote.client_name}, conseguiu rever a proposta ${quote.reference} (v${data.version})? Podemos esclarecer alguma dúvida? Pode comunicar a sua decisão aqui: ${data.link || 'contacte a Recepção'}`} className="mt-3 w-full rounded-lg border bg-white p-3 text-sm" /><button type="button" onClick={() => copy(`Olá ${quote.client_company || quote.client_name}, conseguiu rever a proposta ${quote.reference} (v${data.version})? Podemos esclarecer alguma dúvida? Pode comunicar a sua decisão aqui: ${data.link || 'contacte a Recepção'}`)} className="mt-3 text-xs font-semibold underline">Copiar lembrete</button>{data.whatsapp_number ? <a href={`https://wa.me/${data.whatsapp_number}?text=${encodeURIComponent(`Olá, podemos esclarecer alguma dúvida sobre a proposta ${quote.reference}? ${data.link || ''}`)}`} target="_blank" rel="noreferrer" className="ml-4 text-xs font-semibold underline">Abrir WhatsApp</a> : null}</div>
            <div className="flex flex-wrap gap-3 border-t pt-4"><button type="button" onClick={() => chooseTool('decision')} className="desk-primary rounded-xl px-4 py-3 text-sm font-semibold text-white">Já tenho a decisão</button>{onFollowUps ? <button type="button" onClick={onFollowUps} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold"><CalendarClock aria-hidden="true" className="h-4 w-4" />Agendar próximo contacto</button> : null}</div>
          </section> : null}
    {activeTool === 'decision' && actionable ? <form onSubmit={(e) => { e.preventDefault(); void act('phone'); }} onChange={() => onDirtyChange?.(true)} className="space-y-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Decisão comunicada por telefone</h3><fieldset disabled={!editable || busy} className="space-y-4"><label className="block text-sm">Nome do contacto<input required value={contact} onChange={(e) => setContact(e.target.value)} maxLength={160} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="block text-sm">Decisão<select value={phoneDecision} onChange={(e) => setPhoneDecision(e.target.value)} className="ml-3 rounded-lg border p-2"><option value="accept">Aceitar</option><option value="changes">Pedir alterações</option><option value="decline">Recusar</option></select></label><label className="block text-sm">Contexto e confirmação obtida<textarea required value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={3000} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Confirmo que este contacto comunicou esta decisão para a versão atual.</label><button disabled={!confirmed} className="rounded-xl bg-[#173f30] px-4 py-3 text-sm text-white disabled:opacity-50">Registar decisão do cliente</button></fieldset></form> : null}

          {emailId && activeTool === 'send' ? <section className="space-y-4 rounded-2xl border bg-white p-5"><h3 className="font-semibold">Email preparado · atendimento</h3><EmailDesk initialConversation={emailId} quoteReference={quote.reference} onDirtyChange={emailDirtyChange} onBusyChange={(value) => { setBusy(value); onBusyChange?.(value); }} onChanged={refreshChannels} /></section> : null}
        </>}
      </>}
    </>}
  </section>;
}

export function ClientProposalWorkspace(props: ComponentProps<typeof ClientProposalWorkspaceContent>) {
  return <ClientProposalWorkspaceContent key={props.quote.reference} {...props} />;
}
