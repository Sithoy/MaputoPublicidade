'use client';

import { ChevronRight, LockKeyhole } from 'lucide-react';
import type { AdminQuote } from '@/lib/admin-api';
import { deskDate } from '@/lib/reception-workdesk';
import { receptionStage, receptionSteps } from '@/lib/operational-workflow';
import { taskLabels } from './ReceptionOverview';

export type QueueQuote = AdminQuote & { owner_name?: string; job_summary?: string; reception_completed_at?: string | null };

export function ReceptionQueue({ rows, count, loading, busy, task, onOpen }: {
  rows: QueueQuote[]; count: number; loading: boolean; busy: boolean;
  task: string; onOpen: (value: string) => void;
}) {
  return <section id="reception-queue" tabIndex={-1} aria-label="Lista de tarefas" aria-busy={loading} className="desk-queue min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Caixa partilhada</p>
        <h2 className="mt-1 text-sm font-semibold">{taskLabels[task] || 'Fila de trabalho'} <span className="text-slate-400">({loading ? '…' : count})</span></h2>
      </div>
      <p className="text-xs text-slate-500">Abra uma tarefa para consultar os detalhes e continuar o trabalho.</p>
    </div>
    {loading && !rows.length ? <p role="status" className="p-5 text-sm text-slate-500">A organizar os atendimentos…</p> : <ul className="divide-y" aria-label="Tarefas da recepção">
      {rows.map((row) => {
        const client = row.client_company || row.client_name;
        const date = row.workdesk?.follow_up_date || row.workdesk?.confirmed_date;
        return <li key={row.reference}>
          <button type="button" disabled={busy || loading} onClick={() => onOpen(row.reference)} aria-label={`${row.reference} ${client} — Abrir atendimento`}
            className="desk-queue-row grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-50 md:grid-cols-[minmax(0,1fr)_200px_155px_20px] md:gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span>{row.reference}</span>{row.urgency === 'urgent' ? <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">Urgente</span> : null}</div>
              <p className="mt-1 truncate text-sm font-semibold text-brand-900">{client}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{row.job_summary || row.items?.[0]?.description || row.reception?.briefing?.project_name || 'Necessidade por confirmar'}</p>
            </div>
            <div className="col-start-1 row-start-2 text-xs md:col-start-auto md:row-start-auto">
              <p className="font-semibold text-brand-800">{row.workdesk?.stage_label || receptionSteps[receptionStage(row).index]}</p>
              {row.workdesk?.edit_session ? <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><LockKeyhole aria-hidden="true" className="h-3 w-3" />Em edição por {row.workdesk.edit_session.editor_name}</p> : null}
            </div>
            <p className="col-start-1 row-start-3 text-xs text-slate-500 md:col-start-auto md:row-start-auto">{date ? `${row.workdesk?.follow_up_date ? 'Seguimento' : 'Agendado'} ${deskDate(date, !row.workdesk?.follow_up_date)}` : 'Sem compromisso marcado'}</p>
            <ChevronRight aria-hidden="true" className="col-start-2 row-span-3 row-start-1 h-4 w-4 text-slate-400 md:col-start-auto md:row-span-1 md:row-start-auto" />
          </button>
        </li>;
      })}
    </ul>}
    {!loading && !rows.length ? <div className="px-5 py-12 text-center text-sm text-slate-500"><p>Nenhum pedido neste filtro.</p><p className="mt-2 text-xs">Altere os filtros acima para consultar outros pedidos.</p></div> : null}
  </section>;
}
