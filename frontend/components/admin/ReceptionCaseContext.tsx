'use client';

import { useState, type FormEvent } from 'react';
import type { AdminQuote } from '@/lib/admin-api';
import { fetchWithAuth } from '@/lib/auth';
import { deskDate, maputoToday, waitingTime } from '@/lib/reception-workdesk';

export function ReceptionCaseContext({ quote, canSchedule, busy, onBusy, onSaved, onDirty }: {
  quote: AdminQuote; canSchedule: boolean; busy: boolean;
  onBusy: (value: boolean) => void; onSaved: (value: { date: string | null; note: string }) => void; onDirty: (value: boolean) => void;
}) {
  const context = quote.workdesk;
  const [date, setDate] = useState(context?.follow_up_date || '');
  const [note, setNote] = useState(context?.follow_up_note || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save(event?: FormEvent, clear = false) {
    event?.preventDefault();
    if (busy || !canSchedule) return;
    onBusy(true); setError(''); setNotice('');
    try {
      const value: { date: string | null; note: string } = await fetchWithAuth(`/api/reception/${encodeURIComponent(quote.reference)}/follow-up/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: clear ? null : date || null, note: clear ? '' : note }),
      });
      setNotice(clear ? 'Seguimento concluído.' : 'Seguimento guardado na agenda.');
      setDate(value.date || ''); setNote(value.note);
      onDirty(false); onSaved(value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar o seguimento.'); }
    finally { onBusy(false); }
  }
  if (!context) return <p className="text-xs text-slate-500">O resumo operacional ainda não está disponível. Consulte as etapas e o histórico abaixo.</p>;
  return <div className="space-y-4" onChange={(event) => event.stopPropagation()}>
    <dl className="grid gap-3 text-xs sm:grid-cols-2 2xl:grid-cols-4">
      <div className="desk-context-fact"><dt>Acompanhamento</dt><dd>Equipa de Recepção</dd></div>
      <div className="desk-context-fact"><dt>Data pretendida pelo cliente</dt><dd>{deskDate(context.requested_date)}</dd></div>
      <div className="desk-context-fact"><dt>Entrega / levantamento agendado</dt><dd>{deskDate(context.confirmed_date, true)}</dd></div>
      <div className="desk-context-fact"><dt>Último envio registado ao cliente</dt><dd>{context.last_contact_at ? deskDate(context.last_contact_at, true) : 'Sem envio registado'}</dd><p className="mt-1 text-[10px] text-slate-500">Proposta ou mensagem da MP; não confirma leitura.</p></div>
    </dl>
    {context.blocker ? <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs"><p className="font-semibold text-amber-900">Dependência: {context.blocker}</p>{context.waiting_since ? <p className="mt-1 text-amber-800">{waitingTime(context.waiting_since)}</p> : null}</div> : null}
    <details className="desk-follow-up rounded-xl border p-3">
      <summary className="cursor-pointer text-xs font-semibold text-brand-900">Próximo seguimento · {context.follow_up_date ? deskDate(context.follow_up_date) : 'Ainda não agendado'}</summary>
      {context.follow_up_note ? <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{context.follow_up_note}</p> : null}
      {canSchedule ? <form onSubmit={save} className="mt-4 space-y-3"><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
        <label className="text-xs">Data do seguimento<input required type="date" min={maputoToday()} value={date} onChange={(event) => { setDate(event.target.value); onDirty(true); }} className="mt-1 block w-full rounded-lg border p-2" /></label>
        <label className="text-xs">O que precisa de acompanhar?<input maxLength={500} value={note} onChange={(event) => { setNote(event.target.value); onDirty(true); }} placeholder="Ex.: confirmar aprovação com o cliente" className="mt-1 block w-full rounded-lg border p-2" /></label>
      </fieldset><div className="flex flex-wrap gap-3"><button disabled={busy} className="desk-primary rounded-lg px-3 py-2 text-xs font-semibold text-white">Guardar seguimento</button>{context.follow_up_date ? <button disabled={busy} type="button" onClick={() => save(undefined, true)} className="rounded-lg border px-3 py-2 text-xs">Concluir seguimento</button> : null}</div></form> : <p className="mt-3 text-xs text-slate-500">Inicie uma edição para agendar o próximo contacto para toda a Recepção.</p>}
      {error ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}{notice ? <p role="status" className="mt-3 text-xs text-brand-800">{notice}</p> : null}
    </details>
  </div>;
}
