'use client';

import { ArrowRight, CalendarDays, Clock3, MessagesSquare, Zap } from 'lucide-react';

export type ReceptionHQ = { counts: Record<string, number>; unassigned_team: number; scope: string; updated_at: string };
export const taskLabels: Record<string, string> = {
  all: 'Todos os trabalhos', new: 'Novos pedidos', briefing: 'Completar briefing', proposal: 'Preparar / corrigir proposta',
  send: 'Prontas para enviar', delivery: 'Coordenar entrega', review: 'Com o Comercial', client: 'Com o cliente',
  production: 'Em produção', handover: 'Confirmar ordem de produção', messages: 'Conversas por responder',
  urgent: 'Pedidos urgentes', overdue: 'Compromissos de dias anteriores', today: 'Agenda de hoje',
  followup: 'Seguimentos para hoje ou em atraso', delivery_today: 'Entregas / levantamentos de hoje',
};

const sections = [
  { title: 'Agora', question: 'O que precisa da minha atenção?', icon: Zap,
    tasks: [ ['new', 'Novos pedidos'], ['overdue', 'Compromissos por resolver'], ['messages', 'Conversas por responder'],
      ['briefing', 'Briefings por completar'], ['proposal', 'Propostas por preparar / corrigir'], ['send', 'Propostas prontas para enviar'] ] },
  { title: 'Dia da recepção', question: 'O que temos marcado para hoje?', icon: CalendarDays,
    tasks: [ ['today', 'Pedidos com compromisso hoje'], ['followup', 'Seguimentos a fazer'], ['delivery_today', 'Entregas / levantamentos hoje'] ] },
  { title: 'A acompanhar', question: 'De quem estamos à espera?', icon: Clock3,
    tasks: [ ['review', 'Aprovação do Comercial'], ['client', 'Decisão do cliente'], ['production', 'Execução pela Produção'], ['handover', 'Confirmação da ordem'] ] },
];

export function ReceptionOverview({ data, name, task, onTask, onInbox, disabled }: {
  data: ReceptionHQ | null; name: string; task: string; onTask: (value: string) => void;
  onInbox: () => void; disabled: boolean;
}) {
  return <section aria-label="Agenda da Recepção" className="space-y-4">
    <div className="desk-hero flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Reception HQ · Agenda de trabalho</p>
        <h1 className="mt-2 font-semibold tracking-tight">Olá{name ? `, ${name}` : ''}. O que vamos resolver hoje?</h1>
        <p className="mt-2 text-sm text-slate-500">Prioridades, compromissos e esperas — com o pedido completo sempre à mão.</p></div>
      {data ? <p className="text-xs text-slate-500">Atualizado às {new Date(data.updated_at).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' })}</p> : null}
    </div>
    {data ? <>
      <div className="desk-overview-strip flex flex-wrap items-center gap-x-5 gap-y-3 border-y py-3 text-sm">
        <span><strong>{data.counts.total}</strong> pedidos em acompanhamento</span>
        <button type="button" disabled={disabled} aria-pressed={task === 'urgent'} onClick={() => onTask('urgent')} className="font-semibold text-amber-800">{data.counts.urgent} urgentes <span aria-hidden="true">↗</span></button>
        <button type="button" disabled={disabled} onClick={onInbox} className="ml-auto inline-flex items-center gap-2 text-xs font-semibold"><MessagesSquare className="h-4 w-4" />Caixa de entrada · {data.counts.messages_general} sem pedido</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">{sections.map(({ title, question, icon: Icon, tasks }) => <section key={title} aria-label={title} className="desk-agenda-card rounded-2xl border p-4">
        <header className="mb-3 flex items-start gap-3"><Icon className="desk-task-icon shrink-0" /><div><h2 className="font-semibold text-brand-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{question}</p></div></header>
        <div className="space-y-1">{tasks.map(([key, label]) => <button key={key} type="button" disabled={disabled} onClick={() => onTask(key)} aria-pressed={task === key} className="desk-agenda-action flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs">
          <span className="min-w-0 flex-1">{label}</span><span className={`desk-agenda-count ${data.counts[key] ? 'font-semibold text-brand-900' : 'text-slate-400'}`}>{data.counts[key] ?? '—'}</span><ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
        </button>)}</div>
        {title === 'Dia da recepção' ? <p className="mt-3 border-t pt-3 text-[11px] leading-5 text-slate-500">Datas no horário de Maputo. Inclui entregas agendadas e seguimentos; não transforma a data pretendida pelo cliente numa promessa.</p> : null}
        {title === 'A acompanhar' ? <p className="mt-3 border-t pt-3 text-[11px] leading-5 text-slate-500">Abra um pedido para ver a dependência, o responsável de acompanhamento e agendar o próximo contacto.</p> : null}
      </section>)}</div>
    </> : <p role="status" className="py-6 text-sm text-slate-500">A preparar a agenda de trabalho…</p>}
  </section>;
}
