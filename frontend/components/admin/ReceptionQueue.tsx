'use client';

import type { AdminQuote } from '@/lib/admin-api';
import { deskDate } from '@/lib/reception-workdesk';
import { receptionStage, receptionSteps } from '@/lib/operational-workflow';
import { taskLabels } from './ReceptionOverview';

export type QueueQuote = AdminQuote & { owner_name?: string; job_summary?: string; reception_completed_at?: string | null };
export function ReceptionQueue({ rows, count, loading, busy, task, reference, onOpen, open }: {
  rows: QueueQuote[]; count: number; loading: boolean; busy: boolean;
  task: string; reference: string; open: boolean;
  onOpen: (value: string) => void;
}) {
  return <aside id="reception-queue" aria-label="Fila de atendimentos" className={`desk-queue min-h-0 min-w-0 border-b xl:border-b-0 xl:border-r ${open ? 'flex flex-col' : 'hidden xl:flex xl:flex-col'}`}>
    <div className="border-b p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">Caixa partilhada</p><h2 className="mt-1 text-sm font-semibold">{taskLabels[task] || 'Fila de trabalho'} <span className="text-slate-400">({loading ? '…' : count})</span></h2><p className="mt-2 text-[11px] text-slate-500">Prioridade e compromissos por resolver primeiro.</p></div>
    <div className="desk-reception-list min-h-0 flex-1 divide-y overflow-y-auto">{loading && !rows.length ? <p role="status" className="p-5 text-sm text-slate-500">A organizar os atendimentos…</p> : rows.map((row) => <button type="button" key={row.reference} disabled={busy} aria-pressed={reference === row.reference} onClick={() => onOpen(row.reference)} className={`desk-queue-row w-full border-l-4 p-4 text-left ${reference === row.reference ? 'desk-queue-selected border-l-brand-700' : 'border-l-transparent'}`}>
      <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{row.reference}</span>{row.urgency === 'urgent' ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Urgente</span> : null}</div>
      <p className="mt-2 text-sm font-semibold">{row.client_company || row.client_name}</p><p className="mt-1 truncate text-xs text-slate-500">{row.job_summary || row.reception?.briefing?.project_name || 'Necessidade por confirmar'}</p>
      <p className="mt-2 text-[11px] font-semibold text-brand-800">{row.workdesk?.stage_label || receptionSteps[receptionStage(row).index]}</p>
      {row.workdesk?.blocker ? <p className="mt-1 truncate text-[11px] text-amber-800" title={row.workdesk.blocker}>{row.workdesk.blocker}</p> : null}
      <div className="mt-2 space-y-1 text-[11px] text-slate-500">{row.workdesk?.edit_session ? <p>Em edição por {row.workdesk.edit_session.editor_name}</p> : null}{row.workdesk?.follow_up_date ? <p>Seguimento {deskDate(row.workdesk.follow_up_date)}</p> : row.workdesk?.confirmed_date ? <p>Agendado {deskDate(row.workdesk.confirmed_date, true)}</p> : null}</div>
    </button>)}</div>
    {!loading && !rows.length ? <div className="p-5 text-sm text-slate-500"><p>Nenhum pedido neste filtro.</p><p className="mt-2 text-xs">Altere os filtros acima para consultar outros pedidos.</p></div> : null}
  </aside>;
}
