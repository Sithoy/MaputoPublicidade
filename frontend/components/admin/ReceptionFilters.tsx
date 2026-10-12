'use client';

import { RefreshCw, Search } from 'lucide-react';
import { taskLabels } from './ReceptionOverview';

const stages = ['all', 'new', 'briefing', 'proposal', 'review', 'send', 'client', 'handover', 'production', 'delivery', 'urgent', 'followup', 'delivery_today'];
const shortcuts = [['all', 'Todos'], ['today', 'Hoje'], ['overdue', 'Por resolver'], ['messages', 'Por responder']];
export function ReceptionFilters({ search, state, task, busy, dirty, onSearch, onState, onTask, onRefresh }: {
  search: string; state: string; task: string; busy: boolean; dirty: boolean;
  onSearch: (value: string) => void; onState: (value: string) => void; onTask: (value: string) => void; onRefresh: () => void;
}) {
  return <section aria-label="Filtros dos pedidos" className="desk-reception-filters border-b p-4">
    <div className="grid items-end gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(220px,1fr)_180px_240px_auto]">
      <label className="relative block"><span className="sr-only">Pesquisar cliente ou referência</span><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input maxLength={80} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Pesquisar cliente, empresa ou referência…" className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm" /></label>
      <label className="text-xs text-slate-500">Mostrar<select disabled={busy} value={state} onChange={(event) => onState(event.target.value)} className="mt-1 w-full rounded-xl border bg-white p-2.5 text-xs"><option value="active">Pedidos em aberto</option><option value="waiting">Aguardar decisão</option><option value="closed">Arquivo</option></select></label>
      <label className="text-xs text-slate-500">Etapa / necessidade<select disabled={busy} value={task} onChange={(event) => onTask(event.target.value)} className="mt-1 w-full rounded-xl border bg-white p-2.5 text-xs">{Array.from(new Set([...stages, ...shortcuts.map(([key]) => key)])).map((key) => <option key={key} value={key}>{taskLabels[key] || key}</option>)}</select></label>
      <button type="button" aria-label="Atualizar fila" disabled={busy || dirty} onClick={onRefresh} className="flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-xs font-semibold disabled:opacity-40"><RefreshCw className="h-4 w-4" />Atualizar</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] uppercase tracking-widest text-slate-500">Ver rapidamente</span>{shortcuts.map(([key, label]) => <button disabled={busy} key={key} type="button" aria-pressed={task === key && state === 'active'} onClick={() => onTask(key)} className="desk-quick-filter rounded-lg px-3 py-1.5 text-xs font-semibold">{label}</button>)}{task !== 'all' ? <span className="ml-auto text-xs text-brand-800">{taskLabels[task]}</span> : null}</div>
  </section>;
}
