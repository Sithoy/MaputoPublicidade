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
  const disabled = busy || loading;
  return <section id="reception-queue" tabIndex={-1} aria-label="Lista de tarefas" aria-busy={loading} className="desk-queue min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Caixa partilhada</p>
        <h2 className="text-sm font-semibold">{taskLabels[task] || 'Fila de trabalho'} <span className="text-slate-400">({loading ? '…' : count})</span></h2>
      </div>
      <p className="text-xs text-slate-500">Abra um pedido para continuar o trabalho.</p>
    </div>
    {loading && !rows.length ? <p role="status" className="p-5 text-sm text-slate-500">A organizar os atendimentos…</p> : rows.length ? <div role="region" aria-label="Tabela de tarefas — deslize para ver todas as colunas" tabIndex={0} className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700">
      <table aria-label="Tarefas da recepção" className="w-full min-w-[640px] table-fixed border-collapse text-left text-xs sm:min-w-[940px]">
        <thead className="border-b bg-[#f5f6ef] text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="w-[34%] px-5 py-2.5 font-medium sm:w-[22%]">Cliente / referência</th>
            <th scope="col" className="hidden w-[21%] px-3 py-2.5 font-medium sm:table-cell">Trabalho</th>
            <th scope="col" className="w-[18%] px-3 py-2.5 font-medium">Estado</th>
            <th scope="col" className="w-[21%] px-3 py-2.5 font-medium">Próxima ação</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Compromisso</th>
            <th scope="col" className="relative w-12"><span className="sr-only">Abrir pedido</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const client = row.client_company || row.client_name;
            const stage = receptionStage(row);
            const desk = row.workdesk;
            const date = desk?.follow_up_date || desk?.confirmed_date;
            const locked = desk?.edit_session;
            const summary = row.job_summary || row.items?.[0]?.description || row.reception?.briefing?.project_name || 'Necessidade por confirmar';
            return <tr key={row.reference} onClick={() => { if (!disabled) onOpen(row.reference); }}
              className={`desk-queue-row group focus-within:bg-[#f1f3e8] ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
              <td className="relative px-5 py-2.5 align-middle">
                {row.urgency === 'urgent' ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-amber-500" /> : null}
                <p className="line-clamp-1 text-sm font-semibold text-brand-900" title={client}>{client}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                  <span className="tabular-nums">{row.reference}</span>
                  {row.urgency === 'urgent' ? <span className="font-semibold text-amber-800">Urgente</span> : null}
                </div>
              </td>
              <td className="hidden px-3 py-2.5 align-middle sm:table-cell"><p className="line-clamp-2 leading-5 text-slate-600" title={summary}>{summary}</p></td>
              <td className="px-3 py-2.5 align-middle"><span className={`inline-block rounded-md px-2 py-1 text-xs font-medium leading-4 ${stage.waiting ? 'bg-amber-50 text-amber-900' : 'bg-brand-50 text-brand-800'}`}>{desk?.stage_label || receptionSteps[stage.index]}</span></td>
              <td className="px-3 py-2.5 align-middle">
                <p className="line-clamp-2 font-medium leading-5 text-brand-900" title={desk?.next_action}>{desk?.next_action || 'Consultar pedido'}</p>
                {locked ? <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-4 text-slate-500"><LockKeyhole aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" /><span className="line-clamp-1" title={`Em edição por ${locked.editor_name}`}>Em edição por {locked.editor_name}</span></p> : desk?.blocker ? <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-slate-500" title={desk.blocker}>{desk.blocker}</p> : null}
              </td>
              <td className="px-3 py-2.5 align-middle">
                {date ? <><p className="font-medium tabular-nums text-slate-700">{deskDate(date, !desk?.follow_up_date)}</p><p className="mt-0.5 text-[11px] text-slate-500">{desk?.follow_up_date ? 'Seguimento' : 'Agendado'}</p></> : <span className="text-slate-400">Por agendar</span>}
              </td>
              <td className="pr-1 align-middle">
                <button type="button" disabled={disabled} onClick={(event) => { event.stopPropagation(); onOpen(row.reference); }} aria-label={`${row.reference} ${client} — Abrir atendimento`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 group-hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed">
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div> : null}
    {!loading && !rows.length ? <div className="px-5 py-12 text-center text-sm text-slate-500"><p>Nenhum pedido neste filtro.</p><p className="mt-2 text-xs">Altere os filtros acima para consultar outros pedidos.</p></div> : null}
  </section>;
}
