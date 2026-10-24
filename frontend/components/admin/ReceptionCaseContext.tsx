'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import type { AdminQuote } from '@/lib/admin-api';
import { fetchWithAuth } from '@/lib/auth';
import { deskDate, maputoToday, waitingTime } from '@/lib/reception-workdesk';
import { receptionStage } from '@/lib/operational-workflow';

export function ReceptionCaseContext({ quote, canSchedule, busy, onBusy, onSaved, onDirty, nextAction, compact = false }: {
  quote: AdminQuote; canSchedule: boolean; busy: boolean;
  onBusy: (value: boolean) => void; onSaved: (value: { date: string | null; note: string }) => void; onDirty: (value: boolean) => void;
  nextAction?: ReactNode; compact?: boolean;
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
  if (!context) return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f5f7ee] p-3"><p className="text-xs text-slate-500">O resumo operacional ainda não está disponível. Consulte as etapas e o histórico abaixo.</p>{!compact ? nextAction : null}</div>;
  const current = receptionStage(quote);
  const closed = quote.status === 'cancelled' || quote.status === 'delivered' || ['cancelled', 'delivered'].includes(quote.operational_order_status || '');
  return <div className="space-y-3" onChange={(event) => event.stopPropagation()}>
    <dl aria-label="Informação desta etapa" className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[#e6e9df] py-3 text-xs">
      {current.index < 2 ? <div><dt className="text-[10px] text-slate-500">Data pretendida pelo cliente</dt><dd className="mt-1 font-medium text-brand-900">{deskDate(context.requested_date)}</dd></div> : null}
      {current.index === 2 && quote.valid_until ? <div><dt className="text-[10px] text-slate-500">Validade da proposta</dt><dd className="mt-1 font-medium text-brand-900">{deskDate(quote.valid_until)}</dd></div> : null}
      {current.index === 3 || context.confirmed_date ? <div><dt className="text-[10px] text-slate-500">Entrega / levantamento agendado</dt><dd className="mt-1 font-medium text-brand-900">{deskDate(context.confirmed_date, true)}</dd></div> : null}
      {current.index === 2 || context.last_contact_at ? <div><dt className="text-[10px] text-slate-500">Último envio registado ao cliente</dt><dd className="mt-1 font-medium text-brand-900">{context.last_contact_at ? deskDate(context.last_contact_at, true) : 'Sem envio registado'}</dd><p className="sr-only">Proposta ou mensagem da MP; não confirma leitura.</p></div> : null}
      {!compact && !closed ? <div><dt className="text-[10px] text-slate-500">Seguimento</dt><dd className="mt-1 font-medium text-brand-900">{context.follow_up_date ? deskDate(context.follow_up_date) : 'Por agendar'}</dd></div> : null}
    </dl>
    {!compact ? <section aria-label="Próxima ação" className={`desk-next-action rounded-xl p-4 ${!closed && context.blocker ? 'bg-amber-50' : 'bg-brand-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="text-[10px] font-semibold uppercase tracking-widest">{closed ? 'Trabalho encerrado' : 'Próxima ação'}</h3><p className="mt-1 text-sm text-brand-900">{closed ? 'Consulte o histórico e os registos deste trabalho.' : current.next}</p>{!closed && context.blocker ? <p className="mt-2 text-xs text-[#806329]">À espera de: <span className="font-medium">{context.blocker}</span>{context.waiting_since ? ` · ${waitingTime(context.waiting_since)}` : ''}</p> : null}</div>{nextAction}</div>
    {!closed ? <details className="desk-follow-up mt-3 border-t border-[#dce2d2] pt-3">
      <summary className="cursor-pointer text-xs font-semibold text-brand-900">Próximo seguimento · {context.follow_up_date ? deskDate(context.follow_up_date) : 'Ainda não agendado'}</summary>
      {context.follow_up_note ? <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{context.follow_up_note}</p> : null}
      {canSchedule ? <form onSubmit={save} className="mt-4 space-y-3"><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
        <label className="text-xs">Data do seguimento<input required type="date" min={maputoToday()} value={date} onChange={(event) => { setDate(event.target.value); onDirty(true); }} className="mt-1 block w-full rounded-lg border p-2" /></label>
        <label className="text-xs">O que precisa de acompanhar?<input maxLength={500} value={note} onChange={(event) => { setNote(event.target.value); onDirty(true); }} placeholder="Ex.: confirmar aprovação com o cliente" className="mt-1 block w-full rounded-lg border p-2" /></label>
      </fieldset><div className="flex flex-wrap gap-3"><button disabled={busy} className="desk-primary rounded-lg px-3 py-2 text-xs font-semibold text-white">Guardar seguimento</button>{context.follow_up_date ? <button disabled={busy} type="button" onClick={() => save(undefined, true)} className="rounded-lg border px-3 py-2 text-xs">Concluir seguimento</button> : null}</div></form> : <p className="mt-3 text-xs text-slate-500">Inicie uma edição para agendar o próximo contacto para toda a Recepção.</p>}
      {error ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}{notice ? <p role="status" className="mt-3 text-xs text-brand-800">{notice}</p> : null}
      </details> : null}
    </section> : null}
  </div>;
}
