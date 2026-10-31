'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCheck, Clock3, Palette, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { ProductionWorkspace } from './ProductionWorkspace';

type Task = 'all' | 'new' | 'draft' | 'revisions' | 'approval' | 'followup' | 'ready';
type StudioRow = {
  reference: string; client_name: string; description: string; task: Task; followup: boolean;
  scheduled_date: string | null; version: number | null; published_at: string | null; client_comment: string;
};
type Agenda = { results: StudioRow[]; count: number; next: string | null; overview: Record<Task, number>; updated_at: string };
const labels: Record<Task, string> = {
  all: 'Todos os trabalhos', new: 'Novos trabalhos', draft: 'Artes em preparação', revisions: 'Alterações solicitadas',
  approval: 'Aguardar cliente', followup: 'Recontactar cliente', ready: 'Prontos para Produção',
};
const actions: Record<Task, string> = {
  ...labels, new: 'Preparar arte', draft: 'Continuar criação', revisions: 'Rever alterações',
  approval: 'Acompanhar aprovação', followup: 'Acompanhar aprovação', ready: 'Conferir arte aprovada',
};
const groups: { title: string; question: string; icon: typeof Palette; tasks: Task[] }[] = [
  { title: 'Dar forma', question: 'O que vamos criar ou melhorar?', icon: Palette, tasks: ['revisions', 'new', 'draft'] },
  { title: 'Fazer avançar', question: 'Que respostas precisamos de obter?', icon: Clock3, tasks: ['followup', 'approval'] },
  { title: 'Passar à execução', question: 'O que está pronto para a próxima equipa?', icon: CheckCheck, tasks: ['ready'] },
];

function dateLabel(value: string) {
  return new Date(value.includes('T') ? value : `${value}T12:00:00+02:00`).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', timeZone: 'Africa/Maputo' });
}

export function StudioHome() {
  const { loading, can, user } = useAdminAuth();
  const allowed = can('production.view') && can('quotes.artwork');
  const [data, setData] = useState<Agenda | null>(null);
  const [task, setTask] = useState<Task>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (loading || !allowed || selected) return;
    let active = true;
    setPending(true); setError('');
    const params = new URLSearchParams({ task, page: String(page), search: query });
    fetchWithAuth(`/api/production/studio/?${params}`).then((result: Agenda) => {
      if (active) setData(result);
    }).catch(() => { if (active) setError('Não foi possível carregar a agenda do Studio. Tente novamente.'); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [loading, allowed, task, query, page, revision, selected]);

  function filter(value: Task) { setTask(value); setPage(1); }
  if (loading) return <p role="status">A preparar o Studio…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso ao Studio de Artes.</p>;
  if (selected) return <ProductionWorkspace key={selected} workspace="studio" initialReference={selected} onClose={() => setSelected('')} />;

  const name = user?.first_name;
  const blocked = pending || Boolean(error);
  return <div className="mx-auto max-w-7xl space-y-5 pb-6">
    <header className="desk-hero relative overflow-hidden">
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Studio Artes · Agenda criativa</p>
          <h1 className="mt-3 max-w-2xl font-semibold tracking-tight">Olá{name ? `, ${name}` : ''}. Vamos dar forma às próximas marcas?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Do briefing à arte aprovada. As prioridades da equipa, as respostas do cliente e o próximo passo — num só lugar.</p></div>
        <span className="rounded-2xl border border-[#c5a45a]/30 bg-white/70 p-3 text-brand-800"><Sparkles aria-hidden="true" className="h-7 w-7" /></span>
      </div>
    </header>

    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-brand-900/10 py-3">
      <p className="text-sm text-brand-900"><strong>{data?.overview.all ?? '—'}</strong> trabalhos na agenda <span className="mx-2 text-slate-300">/</span><span className="text-xs text-slate-500">Fila partilhada da equipa de Artes</span></p>
      <button type="button" disabled={pending} onClick={() => setRevision((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-brand-800 disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />Atualizar agenda</button>
    </div>

    <section aria-label="Prioridades do Studio" className="grid gap-4 lg:grid-cols-3">
      {groups.map(({ title, question, icon: Icon, tasks }, index) => <section key={title} className={`desk-agenda-card flex flex-col rounded-2xl border p-5 ${index === 2 ? 'bg-brand-50/60' : 'bg-white'}`}>
        <header className="mb-4 flex items-start gap-3"><Icon aria-hidden="true" className="desk-task-icon shrink-0" /><div><h2 className="font-semibold text-brand-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{question}</p></div></header>
        <div className="space-y-1">{tasks.map((key) => <button type="button" key={key} disabled={!data} aria-pressed={task === key} onClick={() => filter(key)} className={`desk-agenda-action flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${task === key ? 'bg-brand-50 ring-1 ring-brand-200' : ''}`}><span className="flex-1">{labels[key]}</span><span className="font-semibold tabular-nums text-brand-900">{data?.overview[key] ?? '—'}</span><ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" /></button>)}</div>
        {index === 1 ? <p className="mt-auto pt-4 text-[11px] leading-5 text-slate-500">Recontactar: arte sem decisão há 3 dias ou mais. Sugestão de acompanhamento, sem envio automático.</p> : null}
        {index === 2 ? <p className="mt-auto pt-4 text-[11px] leading-5 text-slate-500">Apenas a aprovação da versão atual liberta a arte. A Produção confere e inicia a execução no seu espaço.</p> : null}
      </section>)}
    </section>

    <section aria-labelledby="studio-queue-title" className="overflow-hidden rounded-2xl border border-brand-900/10 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">A bancada da equipa</p><h2 id="studio-queue-title" className="mt-1 text-lg font-semibold text-brand-900">{labels[task]}</h2></div>
        <label className="flex w-full items-center gap-2 rounded-xl border bg-[#f8f9f5] px-3 sm:w-80"><Search aria-hidden="true" className="h-4 w-4 text-slate-400" /><span className="sr-only">Pesquisar trabalhos</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, trabalho ou referência" maxLength={160} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-600" /></label>
        <div className="flex w-full flex-wrap gap-2" aria-label="Filtrar agenda">{(['all', 'new', 'draft', 'revisions', 'approval', 'followup', 'ready'] as Task[]).map((key) => <button type="button" key={key} onClick={() => filter(key)} aria-pressed={task === key} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${task === key ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-brand-50'}`}>{labels[key]}</button>)}</div>
      </header>
      {error ? <div role="alert" className="p-6 text-sm text-red-800">{error}</div> : pending ? <p role="status" className="p-10 text-center text-sm text-slate-500">A organizar os trabalhos…</p> : data?.results.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#f7f8f3] text-[10px] uppercase tracking-wider text-slate-500"><tr><th scope="col" className="px-5 py-3">Cliente / trabalho</th><th scope="col" className="px-4 py-3">Na bancada</th><th scope="col" className="px-4 py-3">Entrega agendada</th><th scope="col" className="px-5 py-3 text-right">Próxima ação</th></tr></thead><tbody className="divide-y divide-slate-100">{data.results.map((row) => <tr key={row.reference} className="hover:bg-brand-50/40">
        <td className="max-w-xs px-5 py-4"><p className="font-semibold text-brand-900">{row.client_name}</p><p title={row.description} className="mt-1 max-w-xs truncate text-xs text-slate-500">{row.description || 'Trabalho personalizado'}</p><p className="mt-1 text-[10px] tracking-wide text-slate-400">{row.reference}</p></td>
        <td className="px-4 py-4"><span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${row.task === 'revisions' || row.followup ? 'bg-amber-50 text-amber-900' : 'bg-brand-50 text-brand-800'}`}>{labels[row.task]}</span><p className="mt-1 text-[11px] text-slate-500">{row.version ? `Versão ${row.version}` : 'Sem versão de arte'}{row.published_at && row.task === 'approval' ? ` · enviada a ${dateLabel(row.published_at)}` : ''}</p>{row.followup ? <p className="mt-1 text-[11px] font-medium text-amber-800">Recontactar cliente</p> : null}</td>
        <td className="px-4 py-4 text-xs text-slate-600">{row.scheduled_date ? dateLabel(row.scheduled_date) : 'Por agendar'}</td>
        <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(row.reference)} aria-label={`${actions[row.task]} · ${row.reference}`} className="inline-flex items-center gap-2 rounded-xl border border-brand-900/15 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-brand-900 hover:text-white">{actions[row.task]}<ArrowRight aria-hidden="true" className="h-3 w-3" /></button></td>
      </tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center"><Palette aria-hidden="true" className="mx-auto h-8 w-8 text-brand-700/40" /><h3 className="mt-3 font-semibold text-brand-900">{query ? 'Nenhum trabalho encontrado' : 'A bancada está em dia'}</h3><p className="mt-2 text-sm text-slate-500">{query ? 'Experimente outro cliente ou referência.' : task === 'all' ? 'Os pedidos aceites que precisam de arte aparecem aqui.' : 'Não há trabalhos nesta prioridade. Consulte a agenda completa.'}</p>{task !== 'all' ? <button type="button" onClick={() => filter('all')} className="mt-4 text-sm font-semibold text-brand-800 underline">Ver todos os trabalhos</button> : null}</div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-[#fcfcf9] px-5 py-4"><p aria-live="polite" className="text-xs text-slate-500">{blocked ? 'Agenda a atualizar' : `${data?.count ?? 0} trabalhos · Página ${page} de ${Math.max(1, Math.ceil((data?.count ?? 0) / 10))}`}<span className="ml-2 text-slate-400">10 por página</span></p><nav aria-label="Paginação do Studio" className="flex gap-2"><button type="button" disabled={blocked || page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">Anterior</button><button type="button" disabled={blocked || !data?.next} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">Seguinte</button></nav></footer>
    </section>
    <p className="text-[11px] leading-5 text-slate-500">A agenda apresenta trabalho autorizado que necessita de arte. “Entrega agendada” não é um prazo de criação. Briefing e materiais do cliente ficam disponíveis ao abrir o trabalho; dados comerciais permanecem fora deste espaço.</p>
  </div>;
}
