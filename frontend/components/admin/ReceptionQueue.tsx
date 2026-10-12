'use client';

import { RefreshCw, Search } from 'lucide-react';
import type { AdminQuote } from '@/lib/admin-api';
import { deskDate } from '@/lib/reception-workdesk';
import { receptionStage, receptionSteps } from '@/lib/operational-workflow';
import { taskLabels } from './ReceptionOverview';

export type QueueQuote = AdminQuote & { owner_name?: string; job_summary?: string; reception_completed_at?: string | null };
export function ReceptionQueue({ rows, count, next, loading, busy, dirty, scope, state, task, search, reference,
  onScope, onState, onTask, onSearch, onOpen, onRefresh, onMore, open }: {
  rows: QueueQuote[]; count: number; next: string | null; loading: boolean; busy: boolean; dirty: boolean;
  scope: string; state: string; task: string; search: string; reference: string; open: boolean;
  onScope: (value: string) => void; onState: (value: string) => void; onTask: (value: string) => void;
  onSearch: (value: string) => void; onOpen: (value: string) => void; onRefresh: () => void; onMore: () => void;
}) {
  return <aside id="reception-queue" aria-label="Fila de atendimentos" className={`desk-queue overflow-hidden rounded-2xl border xl:sticky xl:top-24 ${open ? 'block' : 'hidden xl:block'}`}>
    <div className="space-y-3 border-b p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-widest text-slate-500">O que vou resolver?</p><h2 className="mt-1 text-sm font-semibold">{taskLabels[task] || 'Fila de trabalho'} <span className="text-slate-400">({loading ? '…' : count})</span></h2></div><button aria-label="Atualizar fila" type="button" disabled={dirty || busy} onClick={onRefresh} className="rounded-lg p-2 text-slate-500 disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button></div>
      <label className="relative block"><span className="sr-only">Pesquisar cliente ou referência</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} maxLength={80} onChange={(event) => onSearch(event.target.value)} placeholder="Cliente, empresa ou referência" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm" /></label>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">Responsável<select disabled={busy} value={scope} onChange={(event) => onScope(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="all">Toda a recepção</option><option value="mine">O meu trabalho</option><option value="unassigned">Por assumir</option></select></label><label className="text-xs text-slate-500">Mostrar<select disabled={busy} value={state} onChange={(event) => onState(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="active">Em acompanhamento</option><option value="waiting">Em espera</option><option value="closed">Arquivo</option></select></label></div>
      {task !== 'all' ? <button type="button" onClick={() => onTask('all')} className="text-xs font-semibold text-brand-800 underline">Ver todos os trabalhos</button> : null}
      <p className="text-[11px] leading-5 text-slate-500">Compromissos de dias anteriores primeiro; depois urgentes, ajustes e trabalhos prontos.</p>
    </div>
    <div className="max-h-[65vh] divide-y overflow-y-auto">{loading && !rows.length ? <p role="status" className="p-5 text-sm text-slate-500">A organizar os atendimentos…</p> : rows.map((row) => <button type="button" key={row.reference} disabled={busy} aria-pressed={reference === row.reference} onClick={() => onOpen(row.reference)} className={`desk-queue-row w-full border-l-4 p-4 text-left ${reference === row.reference ? 'desk-queue-selected border-l-brand-700' : 'border-l-transparent'}`}>
      <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{row.reference}</span>{row.urgency === 'urgent' ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Urgente</span> : null}</div>
      <p className="mt-2 text-sm font-semibold">{row.client_company || row.client_name}</p><p className="mt-1 truncate text-xs text-slate-500">{row.job_summary || 'Necessidade por confirmar'}</p>
      <p className="mt-3 text-xs font-semibold text-brand-800">{row.workdesk?.next_action || receptionSteps[receptionStage(row).index]}</p>
      {row.workdesk?.blocker ? <p className="mt-1 truncate text-[11px] text-amber-800" title={row.workdesk.blocker}>{row.workdesk.blocker}</p> : null}
      <div className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] text-slate-500"><span>{row.workdesk?.owner_name || row.owner_name || 'Por assumir'}</span><span>{row.workdesk?.follow_up_date ? `Seguimento ${deskDate(row.workdesk.follow_up_date)}` : row.workdesk?.confirmed_date ? `Agendado ${deskDate(row.workdesk.confirmed_date, true)}` : 'Sem compromisso agendado'}</span></div>
    </button>)}</div>
    {!loading && !rows.length ? <div className="p-5 text-sm text-slate-500"><p>Nenhum pedido neste filtro.</p><p className="mt-2 text-xs">Consulte toda a recepção ou os pedidos por assumir.</p></div> : null}
    {next ? <button type="button" disabled={busy || loading} onClick={onMore} className="w-full border-t p-3 text-sm font-semibold text-brand-800">Mais pedidos</button> : null}
  </aside>;
}
