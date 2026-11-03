'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { requestWorkspaceHref } from '@/lib/admin-workspaces';
import type { ManagementJob, ManagementSnapshot } from '@/lib/management-overview';
import { workBoardColumns } from '@/lib/work-board';

const attentionLabels = { overdue: 'Em atraso / expirada', blocked: 'Bloqueado', risk: 'Em risco' };
const dateTime = (value: string) => new Date(value).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const deadlineDate = (value: string) => value.length === 10 ? new Date(`${value}T12:00:00+02:00`).toLocaleDateString('pt-MZ', { timeZone: 'Africa/Maputo', day: '2-digit', month: 'short' }) : dateTime(value);

export function ManagementOverview() {
  const { loading, can } = useAdminAuth();
  const allowed = can('dashboard.view') && can('orders.view');
  const [days, setDays] = useState(7);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ days: number; data: ManagementSnapshot } | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [exceptionPage, setExceptionPage] = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);
  useEffect(() => {
    if (loading || !allowed) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setPending(true); setError('');
    fetchWithAuth(`/api/management/overview/?days=${days}`, { signal: controller.signal })
      .then((data: ManagementSnapshot) => { if (active) { setSnapshot({ days, data }); setExceptionPage(1); setDeliveryPage(1); } })
      .catch(() => { if (active) setError('Não foi possível atualizar a visão geral. Os dados anteriores podem estar desatualizados.'); })
      .finally(() => { window.clearTimeout(timeout); if (active) setPending(false); });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [loading, allowed, days, revision]);
  const data = snapshot?.days === days ? snapshot.data : null;
  function jobHref(job: ManagementJob) {
    return job.quote_reference && can('quotes.view') ? requestWorkspaceHref(job.quote_reference, can) : `/admin/encomendas/${encodeURIComponent(job.order_reference || job.reference)}`;
  }
  if (loading) return <p role="status">A validar acesso…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso à visão de gestão.</p>;
  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-brand-950">Visão geral</h1><p className="mt-1 text-sm text-slate-500">Prioridades de gestão e compromissos da operação.</p></div>
      <div className="flex items-center gap-3"><Link href="/admin/quadro" className="rounded-xl bg-brand-900 px-4 py-3 text-sm font-medium text-white">Quadro de trabalhos</Link><button type="button" disabled={pending} onClick={() => setRevision(value => value + 1)} className="flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" />Atualizar</button></div>
    </header>
    <p aria-live="polite" className="text-xs text-slate-500">{pending ? 'A atualizar…' : data ? `Atualizado: ${dateTime(data.generated_at)} · Horário de Maputo · Atualização manual` : 'Dados indisponíveis'}</p>
    {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</p> : null}
    {!data && pending ? <p role="status" className="rounded-2xl bg-white p-10">A reunir os dados da operação…</p> : null}
    {data ? <>
      <section aria-label="Indicadores de gestão" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Trabalhos ativos', value: data.counts.active, detail: 'Pedidos e encomendas, sem duplicação', href: '/admin/quadro' },
          { label: 'Precisam de intervenção', value: data.counts.attention, detail: `${data.counts.overdue} em atraso / expirados · ${data.counts.blocked} bloqueados · ${data.counts.risk} em risco`, href: '#intervencao' },
          { label: 'Compromissos próximos', value: data.counts.deliveries, detail: `Entregas / levantamentos · ${days} dias`, href: '#entregas' },
          { label: 'Sem data confirmada', value: data.counts.unscheduled, detail: 'Encomendas ativas por agendar', href: '/admin/quadro' },
        ].map(metric => <Link key={metric.label} href={metric.href} className="rounded-2xl border border-[#dfe3d6] bg-white p-5 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-800"><p className="text-sm text-slate-600">{metric.label}</p><p className="mt-3 text-3xl font-semibold tabular-nums text-brand-950">{metric.value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{metric.detail}</p></Link>)}
      </section>
      <section id="intervencao" className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#dfe3d6] bg-white">
        <div className="border-b p-5"><h2 className="text-lg font-semibold text-brand-950">Precisa de intervenção</h2><p className="mt-1 text-xs text-slate-500">Atrasos primeiro, depois bloqueios e risco. Esperar pelo cliente, dentro do prazo, não é um alerta.</p></div>
        {data.exceptions.length ? <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="bg-[#f7f8f2] text-xs text-slate-500"><tr><th className="p-4">Trabalho</th><th className="p-4">Motivo</th><th className="p-4">Próximo passo / equipa</th><th className="p-4">Atualização</th></tr></thead><tbody>{data.exceptions.slice((exceptionPage - 1) * 8, exceptionPage * 8).map(job => <tr key={job.reference} className="border-t align-top"><td className="p-4"><Link href={jobHref(job)} className="font-semibold text-brand-800 underline underline-offset-4">{job.reference} · {job.client_name}</Link><p className="mt-1 max-w-64 text-xs text-slate-500">{job.summary}</p></td><td className="p-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${job.attention === 'risk' ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-800'}`}>{job.attention ? attentionLabels[job.attention] : ''}</span><ul className="mt-2 max-w-72 space-y-1 text-xs text-slate-600">{job.issues.map(issue => <li key={issue.code}>{issue.label} · {deadlineDate(issue.due)}</li>)}{job.journey.blocker && !['client', 'art_client'].includes(job.journey.key) ? <li>{job.journey.blocker}</li> : null}</ul></td><td className="p-4"><p>{job.journey.next_action}</p><p className="mt-1 text-xs text-slate-500">{job.journey.team}</p></td><td className="p-4 text-xs text-slate-500">{job.days_since_update} dia(s) sem atualização</td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-slate-600">Sem alertas pelas regras atuais. Isto não confirma que todos os trabalhos tenham prazo agendado.</p>}
        <PageControls page={exceptionPage} total={data.exceptions.length} onPage={setExceptionPage} label="alertas" />
      </section>
      <section aria-labelledby="workflow-health"><h2 id="workflow-health" className="text-lg font-semibold text-brand-950">Onde se concentra o trabalho?</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{workBoardColumns.map(column => {
        const group = data.columns.find(item => item.key === column.key);
        return <div key={column.key} className="min-w-0 rounded-2xl border border-[#dfe3d6] border-t-[3px] border-t-[#b89b59] bg-white p-4"><Link href={`/admin/quadro?column=${column.key}`} className="flex justify-between gap-3 font-semibold text-brand-950"><span>{column.label}</span><span className="tabular-nums">{group?.count ?? '—'}</span></Link>{group ? <><p className="mt-3 text-xs text-slate-500">{group.waiting_client} à espera do cliente · {group.attention_count} com alerta</p>{group.oldest_update ? <Link href={jobHref(group.oldest_update)} className="mt-4 block border-t pt-3 text-xs text-brand-800">Sem atualização há mais tempo: {group.oldest_update.reference}<span className="mt-1 block text-slate-500">{group.oldest_update.days_since_update} dia(s)</span></Link> : <p className="mt-4 text-xs text-slate-500">Sem trabalhos nesta fase</p>}</> : <p className="mt-3 text-xs text-slate-500">Dados indisponíveis</p>}</div>;
      })}</div><p className="mt-2 text-xs text-slate-500">A idade refere-se à última atualização do pedido ou encomenda, não ao tempo passado na fase.</p></section>
      <section id="entregas" className="scroll-mt-24 rounded-2xl border border-[#dfe3d6] bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="text-lg font-semibold text-brand-950">Compromissos de entrega</h2><p className="mt-1 text-xs text-slate-500">Apenas datas confirmadas, desde hoje. Datas pretendidas pelo cliente não são promessas.</p></div><label className="text-xs text-slate-500">Horizonte de entregas<select value={days} onChange={event => { setDays(Number(event.target.value)); setDeliveryPage(1); }} className="ml-2 min-h-11 rounded-lg border bg-white px-3 text-sm text-brand-950">{[7, 14, 30].map(value => <option key={value} value={value}>{value} dias</option>)}</select></label></header>
        {data.deliveries.length ? <ul className="divide-y">{data.deliveries.slice((deliveryPage - 1) * 8, deliveryPage * 8).map(job => <li key={job.reference} className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0"><Link href={jobHref(job)} className="font-semibold text-brand-900">{job.client_name} · {job.reference}</Link><p className="mt-1 text-xs text-slate-500">{job.journey.label} · {job.delivery_method === 'delivery' ? 'Entrega no local' : job.delivery_method === 'pickup' ? 'Levantamento' : 'Método por confirmar'}</p></div><div className="text-sm"><p className="font-medium text-brand-950">{job.scheduled_date ? dateTime(job.scheduled_date) : 'Por confirmar'}</p><p className={`mt-1 text-xs ${job.attention ? 'text-amber-800' : 'text-slate-500'}`}>{job.attention ? attentionLabels[job.attention] : job.journey.key === 'delivery' ? 'Trabalho pronto' : 'Ainda em execução'}</p></div><Link href={jobHref(job)} aria-label={`Abrir ${job.reference}`} className="rounded-lg border p-3 text-brand-800"><ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link></li>)}</ul> : <p className="p-6 text-sm text-slate-600">Sem entregas confirmadas neste horizonte. {data.counts.unscheduled} encomenda(s) ativa(s) sem data.</p>}
        <PageControls page={deliveryPage} total={data.deliveries.length} onPage={setDeliveryPage} label="entregas" />
      </section>
      <details className="rounded-xl border border-[#dfe3d6] bg-[#f7f8f2] p-4 text-xs text-slate-600"><summary className="cursor-pointer font-medium text-brand-900">Fontes e critérios</summary><div className="mt-3 space-y-2 leading-5"><p>Pedidos e encomendas do mesmo trabalho contam uma só vez, usando o percurso partilhado com o BrandDesk. Entregues e cancelados ficam fora desta visão ativa. O acesso respeita a função.</p><p>Risco: compromissos próximos na janela de {data.risk_window_hours} horas. Atrasos usam os prazos confirmados; bloqueios usam as dependências técnicas registadas. Cada trabalho conta numa categoria de alerta, com prioridade ao atraso.</p><p>O horizonte de entregas não altera os totais de trabalhos ativos ou os alertas. Esta primeira versão não calcula receita, taxa de conversão, tempo por fase ou taxa histórica de entregas pontuais.</p></div></details>
    </> : null}
  </div>;
}

function PageControls({ page, total, onPage, label }: { page: number; total: number; onPage: (page: number) => void; label: string }) {
  if (total <= 8) return null;
  return <nav aria-label={`Paginação de ${label}`} className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-slate-500"><span>{total} {label} · Página {page} de {Math.ceil(total / 8)}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Anterior</button><button type="button" disabled={page * 8 >= total} onClick={() => onPage(page + 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Seguinte</button></div></nav>;
}
