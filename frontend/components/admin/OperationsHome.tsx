'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Factory, Palette, RefreshCw, Search, Clock3 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { ProductionWorkspace } from './ProductionWorkspace';

const labels = {
  all: 'Todos os trabalhos', preparation: 'Completar preparação', new: 'Preparar arte',
  draft: 'Arte em preparação', revisions: 'Ajustar arte', approval: 'Aguardar cliente',
  followup: 'Recontactar cliente', ready: 'Prontos para produção', production: 'Em produção', delivery: 'Prontos para entrega',
};
type Task = keyof typeof labels;
type Row = { reference: string; client_name: string; description: string; task: Task; followup: boolean; scheduled_date: string | null; needs_art: boolean; missing: string[] };
type Agenda = { results: Row[]; count: number; next: string | null; overview: Record<Task, number> };
const groups = [
  { title: 'Preparar e criar', icon: Palette, tasks: ['preparation', 'new', 'draft', 'revisions'] as Task[] },
  { title: 'Executar e conferir', icon: Factory, tasks: ['ready', 'production', 'delivery'] as Task[] },
  { title: 'Desbloquear o trabalho', icon: Clock3, tasks: ['approval', 'followup'] as Task[] },
];

export function OperationsHome({ initialReference = '' }: { initialReference?: string }) {
  const { loading, can } = useAdminAuth();
  const allowed = can('production.view');
  const [selected, setSelected] = useState(initialReference);
  const [data, setData] = useState<Agenda | null>(null);
  const [task, setTask] = useState<Task>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (loading || !allowed || selected) return;
    let active = true;
    setPending(true); setError('');
    const params = new URLSearchParams({ task, search: query, page: String(page) });
    fetchWithAuth(`/api/production/operations/?${params}`).then((result: Agenda) => {
      if (active) setData(result);
    }).catch(() => { if (active) setError('Não foi possível carregar as operações. Tente novamente.'); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [loading, allowed, selected, task, query, page, revision]);
  function filter(value: Task) { setTask(value); setPage(1); }
  if (loading) return <p role="status">A preparar as operações…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso às Operações.</p>;
  if (selected) return <ProductionWorkspace workspace="operations" initialReference={selected} onClose={() => setSelected('')} />;
  const blocked = pending || Boolean(error);
  return <div className="mx-auto max-w-7xl space-y-5 pb-6">
    <header className="desk-hero">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Operações · Da arte à entrega</p>
      <h1 className="mt-3 font-semibold tracking-tight">Vamos dar vida ao próximo trabalho.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Uma bancada partilhada para preparar, criar e produzir. O mesmo pedido, os mesmos materiais, sem perder o próximo passo.</p>
    </header>
    <section aria-label="Prioridades das operações" className="grid gap-4 lg:grid-cols-3">
      {groups.map(({ title, icon: Icon, tasks }) => <section key={title} className="desk-agenda-card rounded-2xl border bg-white p-5">
        <h2 className="mb-4 flex items-center gap-3 font-semibold text-brand-900"><Icon aria-hidden="true" className="desk-task-icon" />{title}</h2>
        {tasks.map((key) => <button type="button" key={key} disabled={!data || pending} aria-pressed={task === key} onClick={() => filter(key)} className={`desk-agenda-action flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${task === key ? 'bg-brand-50 ring-1 ring-brand-200' : ''}`}><span className="flex-1">{labels[key]}</span><strong>{data?.overview[key] ?? '—'}</strong><ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></button>)}
      </section>)}
    </section>
    <section aria-labelledby="operations-title" className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <header className="space-y-4 border-b p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="operations-title" className="text-lg font-semibold text-brand-900">{labels[task]}</h2><button type="button" disabled={pending} onClick={() => setRevision((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"><RefreshCw aria-hidden="true" className="h-4 w-4" />Atualizar</button></div>
        <label className="flex items-center gap-2 rounded-xl border bg-[#f8f9f5] px-3"><Search aria-hidden="true" className="h-4 w-4 text-slate-400" /><span className="sr-only">Pesquisar operações</span><input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={160} placeholder="Cliente, trabalho ou referência" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-600" /></label>
        <div aria-label="Filtrar operações" className="flex flex-wrap gap-2">{(Object.keys(labels) as Task[]).map((key) => <button type="button" key={key} aria-pressed={task === key} onClick={() => filter(key)} className={`rounded-full border px-3 py-1.5 text-xs ${task === key ? 'bg-brand-900 text-white' : 'text-slate-600'}`}>{labels[key]}</button>)}</div>
      </header>
      {error ? <p role="alert" className="p-6 text-red-800">{error}</p> : pending ? <p role="status" className="p-10 text-center">A organizar os trabalhos…</p> : data?.results.length ? <div className="relative overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-brand-50/50 text-xs text-slate-500"><tr><th scope="col" className="p-4">Cliente / trabalho</th><th scope="col" className="p-4">Etapa / próximo passo</th><th scope="col" className="p-4">Entrega agendada</th><th scope="col" className="p-4"><span className="sr-only">Abrir</span></th></tr></thead><tbody className="divide-y">{data.results.map((row) => <tr key={row.reference} className="hover:bg-brand-50/40">
        <td className="max-w-xs p-4"><p className="font-semibold text-brand-900">{row.client_name}</p><p className="mt-1 truncate text-xs text-slate-500" title={row.description}>{row.description || 'Artigos por confirmar'}</p><p className="mt-1 text-[10px] text-slate-400">{row.reference}</p></td>
        <td className="p-4"><span className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-900">{labels[row.task]}</span><p className="mt-2 text-xs text-slate-500">{row.followup ? 'Recontactar cliente · 3 dias ou mais' : row.needs_art ? 'Com aprovação de arte' : 'Sem etapa de arte'}</p>{row.missing.map((message) => <p key={message} className="mt-1 text-xs text-amber-800">{message}</p>)}</td>
        <td className="p-4 text-xs text-slate-500">{row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString('pt-MZ', { timeZone: 'Africa/Maputo' }) : 'Por agendar'}</td>
        <td className="p-4 text-right"><button type="button" aria-label={`Abrir trabalho ${row.reference}`} onClick={() => setSelected(row.reference)} className="rounded-xl border border-brand-900/20 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-brand-50">Abrir trabalho →</button></td>
      </tr>)}</tbody></table></div> : <p className="p-12 text-center text-sm text-slate-500">Nenhum trabalho nesta fila. Os pedidos aprovados aparecem aqui.</p>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-[#fcfcf9] p-4 text-xs text-slate-500"><p aria-live="polite">{blocked ? 'A atualizar a fila' : `${data?.count ?? 0} trabalhos · Página ${page} de ${Math.max(1, Math.ceil((data?.count ?? 0) / 10))}`} · 10 por página</p><nav aria-label="Paginação das operações" className="flex gap-2"><button type="button" disabled={blocked || page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button><button type="button" disabled={blocked || !data?.next} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Seguinte</button></nav></footer>
    </section>
    <p className="text-xs leading-5 text-slate-500">Briefing, referências e materiais no mesmo trabalho. Arte obrigatória só liberta produção após aprovação da versão atual. Valores e documentos comerciais não fazem parte deste espaço.</p>
  </div>;
}
