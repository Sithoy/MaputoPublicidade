'use client';

import { ArrowRight, Mail, Phone } from 'lucide-react';
import type { AdminQuote } from '@/lib/admin-api';
import { receptionStage } from '@/lib/operational-workflow';
import { ReceptionProgress } from './ReceptionProgress';

export type ReceptionTab = 'summary' | 'work' | 'proposal' | 'messages' | 'history';
export function ReceptionOrderHeader({ quote, step, tab, busy, onStep, onTab, onAction, children, editControls }: {
  quote: AdminQuote; step: number; tab: ReceptionTab; busy: boolean;
  onStep: (value: number) => void; onTab: (value: ReceptionTab) => void; onAction: () => void; children: React.ReactNode; editControls?: React.ReactNode;
}) {
  const current = receptionStage(quote);
  const closed = quote.status === 'cancelled' || ['cancelled', 'delivered'].includes(quote.operational_order_status || '') || quote.status === 'delivered';
  return <section aria-label="Pedido em foco" className="desk-case-header space-y-4 rounded-2xl border p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-slate-500">Pedido em foco · {quote.reference}</p><h2 className="mt-2 text-xl font-semibold">{quote.client_company || quote.client_name}</h2><p className="mt-1 text-sm text-slate-500">{quote.items?.[0]?.description || quote.reception?.briefing?.project_name || 'Necessidade por confirmar'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{quote.workdesk?.stage_label || quote.status_display || quote.status}</span></div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{quote.client_email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{quote.client_email}</span> : null}{quote.client_phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{quote.client_phone}</span> : null}<span>NUIT: {quote.client_nuit || 'Por confirmar'}</span></div>
    <div className={`desk-next-action flex flex-wrap items-center justify-between gap-4 rounded-xl p-4 ${closed ? 'bg-slate-100' : current.waiting ? 'bg-amber-50' : 'bg-brand-50'}`}><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-widest">{closed ? 'Trabalho encerrado' : current.waiting ? 'O que estamos a aguardar?' : 'O que acontece a seguir?'}</p><p className="mt-1 text-sm">{closed ? 'Consulte o histórico e os registos deste trabalho.' : current.next}</p></div><button disabled={busy} type="button" onClick={onAction} className="desk-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white">{quote.workdesk?.next_action || 'Retomar etapa atual'}<ArrowRight className="h-3 w-3" /></button></div>
    <ReceptionProgress current={current.index} selected={step} busy={busy} onSelect={onStep} />
    {children}
    {editControls}
    <div className="desk-tabs flex flex-wrap gap-2" aria-label="Contexto do pedido">{(['summary', 'work', 'proposal', 'messages', 'history'] as const).map((value) => <button disabled={busy} type="button" key={value} aria-pressed={tab === value} onClick={() => onTab(value)} className="rounded-lg border px-3 py-2 text-sm">{{ summary: 'Resumo', work: 'Trabalho', proposal: 'Proposta', messages: 'Mensagens', history: 'Histórico e anexos' }[value]}</button>)}</div>
  </section>;
}
