'use client';

import { useState } from 'react';
import type { AdminQuote } from '@/lib/admin-api';
import { fetchWithAuth } from '@/lib/auth';
import { deskDate, maputoToday, type AttentionIssue } from '@/lib/reception-workdesk';

const teamNames: Record<string, string> = { reception: 'Recepção', art: 'Artes', production: 'Produção', delivery: 'Entrega' };

export function AttentionBadges({ issues = [] }: { issues?: AttentionIssue[] }) {
  const kinds = new Set(issues.map((issue) => issue.kind));
  return <span className="inline-flex flex-wrap gap-1">{(['expired', 'overdue', 'risk'] as const).filter((kind) => kinds.has(kind)).map((kind) => <span key={kind} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${kind === 'risk' ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-800'}`}>{({ expired: 'Proposta expirada', overdue: 'Em atraso', risk: 'Em risco' })[kind]}</span>)}</span>;
}

export function ReceptionAttention({ quote, editable, canRevise, busy, reservationError, onAcquire, onBusy, onDirty, onResolved }: {
  quote: AdminQuote; editable: boolean; canRevise: boolean; busy: boolean;
  reservationError?: string;
  onAcquire: () => void; onBusy: (value: boolean) => void; onDirty: (value: boolean) => void; onResolved: () => void;
}) {
  const issues = quote.workdesk?.issues || [];
  const options: [string, string][] = [];
  if (canRevise && issues.some((issue) => issue.code === 'proposal_expired')) options.push(['revise_proposal', 'Rever e preparar nova proposta'], ['close_request', 'Encerrar pedido não aceite']);
  if (quote.workdesk?.follow_up_date) options.push(['complete_followup', 'Registar resultado do seguimento'], ['reschedule_followup', 'Reagendar seguimento']);
  options.push(['escalate', 'Encaminhar para a equipa responsável']);
  if (quote.order_reference) options.push(['request_delivery', 'Solicitar nova data de entrega']);
  const [action, setAction] = useState(options[0][0]);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [delivery, setDelivery] = useState('');
  const [team, setTeam] = useState('reception');
  const [validity, setValidity] = useState(String(quote.validity_days || 30));
  const [error, setError] = useState('');
  const owner = action === 'request_delivery' ? 'Entrega' : action === 'escalate' ? teamNames[team] || 'Recepção' : 'Recepção';
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !editable) return;
    if (action === 'close_request' && !window.confirm('Encerrar este pedido não aceite? O motivo fica no histórico e os links não poderão aprovar a proposta.')) return;
    onBusy(true); setError('');
    try {
      const values: Record<string, string | number> = { action, reason };
      if (['reschedule_followup', 'escalate', 'request_delivery'].includes(action)) values.next_date = date;
      if (action === 'escalate') values.team = team;
      if (action === 'revise_proposal') values.validity_days = Number(validity);
      if (action === 'request_delivery') values.proposed_delivery = new Date(`${delivery}:00+02:00`).toISOString();
      await fetchWithAuth(`/api/reception/${encodeURIComponent(quote.reference)}/resolve-attention/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      onDirty(false); onResolved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível registar a resolução. O rascunho foi preservado.'); }
    finally { onBusy(false); }
  }
  return <section className="space-y-5">
    <div><AttentionBadges issues={issues} /><p className="mt-3 text-xs leading-5 text-slate-500">Janela de atenção: {quote.workdesk?.risk_window_hours || 48} horas. Datas pretendidas pelo cliente não são tratadas como compromissos confirmados.</p></div>
    <ul className="space-y-2">{issues.map((issue) => <li key={issue.code} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm"><p className="font-semibold text-brand-900">{issue.label}</p><p className="mt-1 text-xs text-slate-600">{deskDate(issue.due, issue.due.includes('T'))}</p></li>)}</ul>
    <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Quem resolve agora?</dt><dd className="mt-1 font-medium">{owner}</dd></div><div><dt className="text-xs text-slate-500">Dependência atual</dt><dd className="mt-1">{issues.find((issue) => issue.kind === 'expired')?.label || quote.journey?.blocker || quote.workdesk?.blocker || 'Confirmar o resultado e definir o próximo passo'}</dd></div></dl>
    {!editable ? <div className="rounded-xl border bg-brand-50 p-4"><p className="text-sm">Reserve a edição para registar a resolução sem interferir com outro atendimento.</p><button type="button" disabled={busy} onClick={onAcquire} className="mt-3 min-h-11 rounded-xl bg-brand-900 px-4 text-sm font-semibold text-white disabled:opacity-50">Reservar atendimento</button></div> : null}
    <form onSubmit={submit} onChange={() => onDirty(true)} className="space-y-4">
      {reservationError ? <p role="alert" className="text-sm text-amber-900">{reservationError}</p> : null}
      <fieldset disabled={busy || !editable} className="space-y-4">
        <label className="block text-sm font-medium">Como vamos resolver?<select value={action} onChange={(event) => { setAction(event.target.value); setError(''); }} className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-sm font-medium">Resultado / motivo<textarea required minLength={5} maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Registe o que aconteceu e a ação combinada." className="mt-2 w-full rounded-xl border p-3" /></label>
        {action === 'revise_proposal' ? <><label className="block text-sm font-medium">Validade da nova versão<select value={validity} onChange={(event) => setValidity(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3">{[7, 15, 30, 60].map((days) => <option key={days} value={days}>{days} dias</option>)}</select></label><p className="text-xs leading-5 text-slate-500">A proposta regressa a preparação. A nova validade começa apenas no novo envio. Os links antigos deixam de permitir aprovação; nada é enviado automaticamente.</p></> : null}
        {action === 'escalate' ? <label className="block text-sm font-medium">Equipa responsável<select value={team} onChange={(event) => setTeam(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3"><option value="reception">Recepção</option>{quote.order_reference ? <><option value="art">Artes</option><option value="production">Produção</option><option value="delivery">Entrega</option></> : null}</select></label> : null}
        {action === 'request_delivery' ? <><label className="block text-sm font-medium">Data e hora proposta · Maputo<input required type="datetime-local" value={delivery} onChange={(event) => setDelivery(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label><p className="text-xs leading-5 text-slate-500">A equipa de Entregas recebe uma notificação. A data confirmada não muda até essa equipa registar o novo compromisso. O motivo fica no histórico interno da Recepção.</p></> : null}
        {['reschedule_followup', 'escalate', 'request_delivery'].includes(action) ? <label className="block text-sm font-medium">Data para acompanhar<input required type="date" min={maputoToday()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label> : null}
        {action === 'complete_followup' ? <p className="text-xs text-slate-500">Conclui apenas este contacto, não o pedido nem a entrega.</p> : null}
        <button className="desk-primary min-h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50">Registar resolução</button>
      </fieldset>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    </form>
  </section>;
}
