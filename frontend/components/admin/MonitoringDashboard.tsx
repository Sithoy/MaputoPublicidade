'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';

type View = 'saude' | 'seguranca' | 'operacao';
export type MonitoringData = {
  generated_at: string; hours: number; category: string; start: string; enabled: boolean;
  first_observed_at: string | null; last_observed_at: string | null;
  summary: { requests: number; server_errors: number; denied: number; rate_limited: number; slow: number; average_ms: number | null; max_ms: number; server_error_rate: number | null };
  events: { code: string; label: string; route: string; method: string; status: number; count: number; request_id: string; last_seen: string }[];
  breakdown: { code: string; count: number }[];
  alerts: { code: string; label: string; count: number; created_at: string }[];
  rules: { code: string; label: string; threshold: number; window_minutes: number; dedupe_minutes: number }[];
  page: number; page_size: number; total_groups: number;
  business: { requests_created: number; orders_created: number; proposals_accepted: number };
  coverage: { backend: boolean; database: string; frontend_edge: boolean; external_alerts_verified: boolean; sentry_configured: boolean; uptime_monitor_verified: boolean; retention: { buckets_days: number; events_days: number; alerts_days: number; cleanup: string } };
};
const number = (value: number | null, suffix = '') => value === null ? '—' : `${value.toLocaleString('pt-MZ')}${suffix}`;
const when = (value: string) => new Date(value).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const href = (view: View, hours: number, page = 1) => `/admin/monitorizacao?view=${view}&hours=${hours}&page=${page}`;

export function MonitoringDashboard() {
  const { loading, can } = useAdminAuth();
  const allowed = can('observability.view');
  const search = useSearchParams();
  const router = useRouter();
  const rawView = search.get('view');
  const view: View = rawView === 'seguranca' || rawView === 'operacao' ? rawView : 'saude';
  const hours = ['1', '24', '168'].includes(search.get('hours') || '') ? Number(search.get('hours')) : 24;
  const rawPage = Number(search.get('page') || '1');
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 1000 ? rawPage : 1;
  const category = view === 'saude' ? 'health' : view === 'seguranca' ? 'security' : 'all';
  const [snapshot, setData] = useState<MonitoringData | null>(null);
  const data = snapshot?.hours === hours && snapshot.category === category && snapshot.page === page ? snapshot : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [automatic, setAutomatic] = useState(false);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setBusy(true); setError('');
    fetchWithAuth(`/api/observability/report/?hours=${hours}&category=${category}&page=${page}`, { signal: controller.signal })
      .then((result: MonitoringData) => { if (active) setData(result); })
      .catch(() => { if (active) setError('Não foi possível atualizar a monitorização. O último retrato disponível foi mantido.'); })
      .finally(() => { window.clearTimeout(timeout); if (active) setBusy(false); });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [allowed, loading, hours, category, page, revision]);
  useEffect(() => {
    if (!automatic || !allowed || loading) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') setRevision((value) => value + 1); }, 60000);
    return () => window.clearInterval(timer);
  }, [allowed, automatic, loading]);
  if (loading) return <p role="status">A verificar o acesso…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso à monitorização do sistema.</p>;
  const stats = data?.summary;
  const metrics = data && stats ? view === 'operacao' ? [
    ['Pedidos registados', number(data.business.requests_created), 'Todos os canais, incluindo Recepção e BrandDesk'],
    ['Propostas aceites', number(data.business.proposals_accepted), 'Data de aprovação guardada no pedido'],
    ['Encomendas criadas', number(data.business.orders_created), 'Registos reais, não cliques do website'],
  ] : view === 'seguranca' ? [
    ['Acessos / entradas recusados', number(stats.denied), 'Inclui permissões, autenticação e validação no login'],
    ['Limites atingidos', number(stats.rate_limited), 'Respostas HTTP 429; não provam um ataque'],
    ['Links inválidos', number(data.breakdown.find((row) => row.code === 'link_invalid')?.count || 0), 'Separados de links expirados ou revogados'],
  ] : [
    ['Pedidos ao backend', number(stats.requests), 'Exclui verificações de saúde e consultas deste painel'],
    ['Falhas no backend', number(stats.server_errors), stats.server_error_rate === null ? 'Ainda sem amostra' : `${number(stats.server_error_rate, '%')} dos pedidos observados`],
    ['Tempo médio', number(stats.average_ms, ' ms'), 'Processamento no backend; não é o tempo da página'],
    ['Pedidos lentos', number(stats.slow), 'Processamento igual ou superior a 2 segundos'],
  ] : [];
  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl border border-[#d8dfd1] bg-[#123e30] p-6 text-white sm:p-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#dccb95]">Sistema · evidência operacional</p>
      <h1 className="mt-3 text-3xl font-semibold">Como está a funcionar a MP?</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Segurança e operação não dependem da aceitação de cookies. Estes dados vêm do backend, não do acompanhamento de visitantes.</p>
      <nav aria-label="Áreas de monitorização" className="mt-6 flex flex-wrap gap-2">{([['saude', 'Saúde'], ['seguranca', 'Segurança'], ['operacao', 'Operação']] as const).map(([key, label]) => <Link key={key} href={href(key, hours)} aria-current={view === key ? 'page' : undefined} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${view === key ? 'border-[#dccb95] bg-[#f5edd6] text-[#123e30]' : 'border-white/25 text-white'}`}>{label}</Link>)}<Link href="/admin/trafego" className="rounded-xl px-4 py-3 text-sm text-white/80 underline">Tráfego do website ↗</Link></nav>
    </header>
    {error ? <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error}<button onClick={() => setRevision((value) => value + 1)} className="ml-3 min-h-11 underline">Tentar novamente</button></div> : null}
    {data ? <section aria-label="Estado da recolha" className="rounded-2xl border border-[#dce1d4] bg-white p-5">
      <p className="font-semibold text-brand-950">{!data.enabled ? 'Recolha operacional desativada neste ambiente' : !data.first_observed_at ? 'A recolha ainda não tem pedidos observados' : 'Recolha do backend disponível · cobertura parcial do sistema'}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">Retrato: {when(data.generated_at)} · últimos {data.hours} h · Maputo. {data.last_observed_at ? `Último minuto observado: ${when(data.last_observed_at)}. Ausência de pedidos não significa indisponibilidade.` : 'Sem histórico de pedidos; não apresentamos disponibilidade ou latência inventadas.'}</p>
    </section> : null}
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm text-slate-600">Período <select aria-label="Período de monitorização" value={hours} onChange={(event) => router.replace(href(view, Number(event.target.value)))} className="ml-2 min-h-11 rounded-xl border bg-white px-3"><option value={1}>Última hora</option><option value={24}>Últimas 24 horas</option><option value={168}>Últimos 7 dias</option></select></label>
      <button disabled={busy} onClick={() => setRevision((value) => value + 1)} className="min-h-11 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-50">Atualizar</button>
      <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={automatic} onChange={(event) => setAutomatic(event.target.checked)} />Atualizar a cada 60 s</label>
      {busy ? <p role="status" className="text-sm text-slate-500">A atualizar…</p> : null}
    </div>
    {data && stats ? <>
      <section aria-label="Indicadores operacionais" className={`grid gap-4 sm:grid-cols-2 ${view === 'saude' ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>{metrics.map(([label, value, note]) => <article key={label} className="rounded-2xl border border-[#dce1d4] bg-white p-5"><h2 className="text-sm text-slate-600">{label}</h2><p className="mt-4 text-3xl font-semibold tabular-nums text-brand-950">{value}</p><p className="mt-3 text-xs leading-5 text-slate-500">{note}</p></article>)}</section>
      {data.alerts.length ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><h2 className="font-semibold text-amber-950">Alertas registados no período · até 10 mais recentes</h2><ul className="mt-3 space-y-2 text-sm text-amber-950">{data.alerts.map((alert) => <li key={`${alert.code}-${alert.created_at}`}><strong>{alert.label}</strong> · {alert.count} em 5 min · {when(alert.created_at)}</li>)}</ul><p className="mt-3 text-xs text-amber-900">Limiares para triagem, não confirmação de ataque. Os administradores recebem uma notificação interna, deduplicada por regra em janelas fixas de 30 minutos.</p></section> : null}
      {view !== 'operacao' ? <section className="rounded-2xl border border-[#dce1d4] bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-brand-950">{view === 'saude' ? 'Falhas para investigar' : 'Ocorrências de segurança e acesso'}</h2><p className="mt-2 text-xs leading-5 text-slate-500">Agrupadas por minuto, evento, rota, método e estado. Cada ID corresponde à última ocorrência do grupo, não a um visitante.</p>
        {!data.events.length ? <p className="mt-5 rounded-xl bg-[#f3f5ed] p-4 text-sm text-slate-600">Sem ocorrências registadas nesta seleção. Isto não garante ausência de incidentes fora da cobertura.</p> : <ol className="mt-5 divide-y">{data.events.map((event) => <li key={`${event.code}-${event.route}-${event.method}-${event.status}-${event.last_seen}`} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_7rem_8rem]"><div className="min-w-0"><h3 className="text-sm font-semibold text-brand-950">{event.label}</h3><p className="mt-1 break-words text-xs text-slate-500">{event.route} · {event.method} · HTTP {event.status}</p><details className="mt-2 text-xs text-slate-600"><summary className="min-h-6 cursor-pointer font-medium">Referência técnica</summary><p className="mt-2">Código: <code>{event.code}</code></p><p className="mt-1 break-all">ID da última ocorrência: <code>{event.request_id}</code></p></details></div><p className="text-sm font-semibold tabular-nums text-brand-950">{number(event.count)} <span className="font-normal text-slate-500">pedidos</span></p><time dateTime={event.last_seen} className="text-xs text-slate-500">{when(event.last_seen)}</time></li>)}</ol>}
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-slate-600"><p>{data.total_groups} grupos · página {data.page}</p><div className="flex gap-3">{data.page > 1 ? <Link className="rounded-xl border px-4 py-3" href={href(view, hours, data.page - 1)}>Anterior</Link> : null}{data.page * data.page_size < data.total_groups && data.page < 1000 ? <Link className="rounded-xl border px-4 py-3" href={href(view, hours, data.page + 1)}>Seguinte</Link> : null}</div></footer>
      </section> : <section className="rounded-2xl border bg-white p-5 text-sm leading-6 text-slate-600"><h2 className="font-semibold text-brand-950">Resultados reais, não estimativas de navegação</h2><p className="mt-2">Os totais usam as datas guardadas nos pedidos e encomendas, em todos os canais. Não identificam de onde veio um cliente, não reconstroem visitas sem consentimento e não substituem a análise financeira.</p></section>}
      <details className="rounded-2xl border border-[#dce1d4] bg-white p-5"><summary className="min-h-6 cursor-pointer font-semibold text-brand-950">Cobertura, alertas e limites</summary><div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
        <ul className="list-disc space-y-2 pl-5"><li>Base de dados acessível no momento deste relatório. O painel não mede uptime externo nem falhas que impedem o próprio relatório de abrir.</li><li>Vercel, bloqueios antes de chegar ao backend e falhas de rede no navegador não estão centralizados nesta versão.</li><li>Sentry: {data.coverage.sentry_configured ? 'configurado no ambiente; entrega e alertas externos ainda não verificados.' : 'não configurado no ambiente.'} Os alertas desta versão são internos e nos logs do backend; não há confirmação de email/SMS externo.</li><li>Sem IPs, emails, cabeçalhos, conteúdos, URLs privadas ou identificação entre visitas nesta base de monitorização. Os logs independentes do alojamento precisam da sua própria revisão.</li><li>Retenção: contadores e alertas {data.coverage.retention.buckets_days} dias; ocorrências {data.coverage.retention.events_days} dias. A limpeza é acionada por pedidos observados, no máximo uma vez por dia. Sem atividade, aguarda execução; o comando <code>purge_monitoring</code> pode ser agendado.</li><li>Os contadores dependem da base de dados. Se a escrita falhar, é emitido <code>monitoring_write_failed</code> no canal de logs, sem bloquear o pedido.</li></ul>
        <h3 className="font-semibold text-brand-950">Regras iniciais · janela de 5 minutos</h3><ul>{data.rules.map((rule) => <li key={rule.code}>{rule.label}: {rule.threshold} ocorrências · deduplicação por janelas de {rule.dedupe_minutes} min.</li>)}</ul>
      </div></details>
    </> : null}
  </div>;
}
