'use client';

import { ArrowRight, Mail, Phone, AlignLeft, MessageSquare, History, CalendarClock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminQuote } from '@/lib/admin-api';
import { receptionStage } from '@/lib/operational-workflow';
import { ReceptionProgress } from './ReceptionProgress';
import { maputoToday } from '@/lib/reception-workdesk';

export type ReceptionTab = 'summary' | 'work' | 'proposal' | 'messages' | 'history' | 'followups';
export function ReceptionOrderHeader({ quote, step, tab, busy, onStep, onTab, onAction, children, editControls, focused = false }: {
  quote: AdminQuote; step: number; tab: ReceptionTab; busy: boolean;
  onStep: (value: number) => void; onTab: (value: ReceptionTab) => void; onAction: () => void;
  children?: (action: ReactNode) => ReactNode; editControls?: ReactNode; focused?: boolean;
}) {
  const current = receptionStage(quote);
  const closed = quote.status === 'cancelled' || ['cancelled', 'delivered'].includes(quote.operational_order_status || '') || quote.status === 'delivered';
  const action = !focused ? <button disabled={busy} type="button" onClick={onAction} className="desk-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{closed ? 'Consultar histórico' : quote.workdesk?.next_action || 'Abrir etapa atual'}<ArrowRight aria-hidden="true" className="h-3 w-3" /></button> : null;
  const followUpDue = Boolean(quote.workdesk?.follow_up_date && quote.workdesk.follow_up_date <= maputoToday());
  const tools = [{ value: 'summary', label: 'Resumo', Icon: AlignLeft }, { value: 'messages', label: 'Mensagens', Icon: MessageSquare }, { value: 'history', label: 'Registos', Icon: History }, { value: 'followups', label: 'Seguimentos', Icon: CalendarClock }] as const;
  return <section aria-label="Pedido em foco" className="desk-case-header space-y-3 rounded-2xl border p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{quote.reference}</p><span className="rounded-full bg-[#eef2e8] px-2.5 py-1 text-[10px] font-medium text-[#315341]">{quote.workdesk?.stage_label || quote.status_display || quote.status}</span></div><h2 className="mt-2 break-words text-xl font-semibold">{quote.client_company || quote.client_name}</h2><p className="mt-1 break-words text-sm text-slate-500">{quote.items?.[0]?.description || quote.reception?.briefing?.project_name || 'Necessidade por confirmar'}</p></div>
      <div className="flex flex-wrap items-center justify-end gap-3">{editControls}<nav aria-label="Contexto do pedido" className="flex items-center gap-1 rounded-xl border border-[#e1e6d8] bg-white p-1">{tools.map(({ value, label, Icon }) => <button key={value} type="button" disabled={busy} aria-label={label} title={value === 'followups' && followUpDue ? `${label} · contacto pendente` : label} aria-haspopup="dialog" aria-expanded={tab === value || (value === 'summary' && tab === 'proposal')} onClick={() => onTab(value)} className="relative rounded-lg p-2.5 text-brand-800 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 disabled:opacity-50 aria-expanded:bg-brand-50"><Icon aria-hidden="true" className="h-4 w-4" />{value === 'followups' && followUpDue ? <><span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#b08732] ring-2 ring-white" /><span className="sr-only">Contacto pendente</span></> : null}</button>)}</nav></div>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
      {quote.client_email ? <a href={`mailto:${quote.client_email}`} className="inline-flex min-w-0 items-center gap-1.5 break-all hover:text-brand-800"><Mail aria-hidden="true" className="h-3 w-3 shrink-0" />{quote.client_email}</a> : null}
      {quote.client_phone ? <a href={`tel:${quote.client_phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-brand-800"><Phone aria-hidden="true" className="h-3 w-3" />{quote.client_phone}</a> : null}
      {quote.client_nuit ? <span>NUIT {quote.client_nuit}</span> : null}
    </div>
    <ReceptionProgress current={current.index} selected={step} busy={busy} onSelect={onStep} />
    {children?.(action)}
  </section>;
}
