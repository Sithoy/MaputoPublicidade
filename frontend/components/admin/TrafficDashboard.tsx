'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, BarChart3, MousePointer2, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';

type Summary = { quote_clicks?: number; signup_clicks?: number; visitors: number; sessions: number; page_views: number; whatsapp_clicks: number; requests: number; registrations: number; request_session_rate: number | null };
type Rank = { views: number; sessions?: number; path?: string; source?: string; device?: string };
export type TrafficData = {
  days: number; timezone: string; generated_at: string; start: string; end: string; first_event_at: string | null;
  summary: Summary; previous: Summary | null; optional_summary?: Summary; optional_previous?: Summary | null; daily: { date: string; views: number }[];
  pages: Rank[]; sources: Rank[]; devices: Rank[]; actions: { kind: string; count: number }[];
};
const names: Record<string, string> = {
  direct: 'Direto / origem desconhecida', google: 'Google', bing: 'Bing', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', referral: 'Outras referências',
  mobile: 'Ecrã móvel', tablet: 'Ecrã intermédio', desktop: 'Ecrã grande',
  '/': 'Página inicial', '/catalogo': 'Catálogo', '/servicos': 'Serviços', '/portfolio': 'Portfólio', '/sobre': 'Sobre nós', '/contactos': 'Contactos', '/orcamento': 'Pedir orçamento',
  whatsapp_click: 'Abrir WhatsApp', quote_click: 'Abrir pedido de orçamento', signup_click: 'Abrir registo de conta', quote_submitted: 'Pedido enviado com sucesso', signup_completed: 'Conta criada com sucesso',
};
const number = (value: number) => value.toLocaleString('pt-MZ');
const dateLabel = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00+02:00` : value).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', timeZone: 'Africa/Maputo' });

function Change({ value, previous }: { value: number; previous?: number }) {
  if (previous === undefined) return <span>Comparação indisponível</span>;
  if (previous === 0) return <span>{value ? 'Sem base anterior para comparar' : 'Sem alteração'}</span>;
  const change = Math.round((value - previous) / previous * 100);
  return <span className={change >= 0 ? 'text-brand-800' : 'text-amber-800'}>{change > 0 ? '+' : ''}{change}% face ao período anterior</span>;
}

function Breakdown({ title, rows, field }: { title: string; rows: Rank[]; field: 'source' | 'path' | 'device' }) {
  const max = Math.max(1, ...rows.map((row) => row.views));
  return <section className="min-w-0 rounded-2xl border border-[#e2e7db] bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-brand-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{field === 'path' ? 'Visualizações agregadas · sem identificação' : 'Amostra consentida · visualizações e sessões distintas'}</p>{rows.length ? <ol className="mt-5 space-y-5">{rows.map((row) => { const key = row[field] || ''; return <li key={key}><div className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 break-words font-medium text-slate-700">{names[key] || key}</span><span className="shrink-0 tabular-nums text-brand-900">{number(row.views)} {field !== 'path' && row.sessions !== undefined ? <span className="text-xs text-slate-500">· {number(row.sessions)}</span> : null}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f0f2e9]" aria-hidden="true"><div className="h-full rounded-full bg-[#b5a15b]" style={{ width: `${row.views / max * 100}%` }} /></div></li>; })}</ol> : <p className="mt-5 text-sm text-slate-500">Sem visualizações neste período.</p>}</section>;
}

function Trend({ days }: { days: TrafficData['daily'] }) {
  const peak = Math.max(0, ...days.map((day) => day.views));
  const max = Math.max(1, peak);
  const points = days.map((day, index) => `${20 + index / Math.max(1, days.length - 1) * 760},${170 - day.views / max * 140}`).join(' ');
  return <section className="rounded-2xl border border-[#e2e7db] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-brand-950">O ritmo das visitas</h2><p className="mt-1 text-xs text-slate-500">Visualizações por dia · horário de Maputo · hoje ainda parcial</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">Website público</span></div><svg viewBox="0 0 800 200" role="img" aria-label="Evolução diária das visualizações; valores disponíveis na tabela abaixo" className="mt-5 w-full"><line x1="20" y1="170" x2="780" y2="170" stroke="#dce3d8" /><line x1="20" y1="100" x2="780" y2="100" stroke="#eef1e8" /><polygon points={`20,170 ${points} 780,170`} fill="#eef3e9" /><polyline points={points} fill="none" stroke="#17634b" strokeWidth="3" strokeLinejoin="round" /><text x="20" y="193" fontSize="10" fill="#68776f">{days[0] ? dateLabel(days[0].date) : ''}</text><text x="780" y="193" textAnchor="end" fontSize="10" fill="#68776f">{days.at(-1) ? dateLabel(days.at(-1)!.date) : ''}</text><text x="20" y="18" fontSize="10" fill="#68776f">Máx. {number(peak)}</text></svg><details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Consultar valores diários</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left"><caption className="sr-only">Visualizações diárias</caption><thead><tr><th className="py-2">Dia</th><th className="text-right">Visualizações</th></tr></thead><tbody>{days.map((day) => <tr key={day.date} className="border-t"><td className="py-2">{dateLabel(day.date)}</td><td className="text-right tabular-nums">{number(day.views)}</td></tr>)}</tbody></table></div></details></section>;
}

export function TrafficDashboard() {
  const { loading, can } = useAdminAuth();
  const allowed = can('traffic.view');
  const [days, setDays] = useState(30);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<TrafficData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    setBusy(true); setData(null); setError('');
    fetchWithAuth(`/api/website-traffic/report/?days=${days}`).then((result: TrafficData) => { if (active) setData(result); }).catch(() => { if (active) setError('Não foi possível carregar o tráfego. Tente novamente.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [loading, allowed, days, revision]);
  if (loading) return <p role="status">A verificar o acesso…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso às métricas do website.</p>;
  const stats = data?.summary;
  const detail = data?.optional_summary || stats;
  const detailPrevious = data?.optional_previous || (data?.optional_summary ? null : data?.previous);
  return <div className="mx-auto max-w-7xl space-y-6"><header className="relative overflow-hidden rounded-3xl bg-[#123e30] p-6 text-white sm:p-8"><div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] border-[#baa35c]/10" aria-hidden="true" /><p className="text-xs uppercase tracking-[0.2em] text-[#d6c58b]">Website · Tráfego e resultados</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Da primeira visita ao próximo projeto.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Descubra de onde chegam os visitantes, o que desperta interesse e as ações que aproximam novos clientes da MP.</p><div className="relative mt-6 flex flex-wrap items-center gap-3"><label className="flex items-center gap-3 text-sm">Período<select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl border border-white/20 bg-[#1e5140] px-4 py-2 text-white"><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select></label><button type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Atualizar</button>{data ? <p className="text-xs text-white/60">{dateLabel(data.start)} — {dateLabel(data.end)} · atualizado às {new Date(data.generated_at).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' })}</p> : null}</div></header>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}<button onClick={() => setRevision((value) => value + 1)} className="ml-3 underline">Tentar novamente</button></div> : null}
    {busy ? <p role="status" className="rounded-2xl border bg-white p-8 text-slate-500">A carregar métricas reais…</p> : null}
    {data && stats ? <>{!stats.page_views ? <section className="rounded-2xl border border-dashed border-[#baa35c] bg-[#faf8ef] p-6"><h2 className="text-lg font-semibold text-brand-950">À espera das primeiras visitas</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Ainda não há contagens públicas neste período. As contagens sem identificadores começam após publicar esta versão, salvo desativação nas preferências ou sinais de privacidade do navegador. Não reconstruímos tráfego histórico nem apresentamos dados de demonstração.</p></section> : null}
    <h2 className="text-lg font-semibold text-brand-950">Contagens agregadas · sem identificação</h2><section aria-label="Indicadores agregados" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{([
      ['Visualizações públicas', stats.page_views, BarChart3, 'Páginas abertas, com ou sem análise detalhada'],
      ['Cliques WhatsApp', stats.whatsapp_clicks, ArrowUpRight, 'Aberturas do canal, não mensagens enviadas'],
      ['Cliques em orçamento', stats.quote_clicks ?? data.actions.find((row) => row.kind === 'quote_click')?.count ?? 0, MousePointer2, 'Cliques para abrir o pedido, não envios'],
      ['Pedidos enviados', stats.requests, MousePointer2, 'Envio público confirmado no navegador'],
    ] as const).map(([label, value, Icon, description]) => <article key={label} className="rounded-2xl border border-[#e2e7db] bg-white p-5"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-medium text-slate-600">{label}</h2><Icon className="h-5 w-5 text-[#a58e45]" /></div><p className="mt-4 text-4xl font-semibold tabular-nums tracking-tight text-brand-950">{number(value)}</p><p className="mt-3 text-xs">Total agregado no período</p><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></article>)}</section>
    <Trend days={data.daily} />
    <Breakdown title="O que mais desperta interesse" rows={data.pages} field="path" />
    {detail ? <section aria-labelledby="optional-analytics" className="space-y-5 rounded-3xl border border-[#d5dece] bg-[#f5f6ee] p-5 sm:p-6"><div><h2 id="optional-analytics" className="text-xl font-semibold text-brand-950">Análise detalhada · só com autorização</h2><p className="mt-2 text-sm text-slate-600">Esta é uma amostra de visitas autorizadas, não o total do website. Não extrapolamos visitantes, sessões ou conversões para quem não autorizou esta camada.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{([
      ['Visitantes estimados', detail.visitors, detailPrevious?.visitors, Users],
      ['Sessões autorizadas', detail.sessions, detailPrevious?.sessions, ArrowUpRight],
      ['Visualizações autorizadas', detail.page_views, detailPrevious?.page_views, BarChart3],
      ['Contas criadas', detail.registrations, detailPrevious?.registrations, Users],
    ] as const).map(([label, value, previous, Icon]) => <article key={label} className="rounded-2xl border border-[#e2e7db] bg-white p-5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm text-slate-600">{label}</h3><Icon className="h-4 w-4 text-[#a58e45]" /></div><p className="mt-3 text-3xl font-semibold text-brand-950">{number(value)}</p><p className="mt-2 text-xs"><Change value={value} previous={previous} /></p></article>)}</div>{!detail.page_views ? <p className="text-sm text-slate-500">Ainda não há visualizações com análise detalhada autorizada neste período.</p> : null}<div className="grid gap-5 lg:grid-cols-2"><Breakdown title="De onde chegam as visitas autorizadas" rows={data.sources} field="source" /><Breakdown title="Como veem o website · amostra autorizada" rows={data.devices} field="device" /></div></section> : null}
    <section className="rounded-2xl border border-[#e2e7db] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-brand-950">Interesse não é o mesmo que conversão.</h2><p className="mt-2 text-sm text-slate-500">Um clique abre uma oportunidade; só o envio bem-sucedido conta como pedido.</p></div><div className="rounded-xl bg-[#f3f4eb] px-4 py-3"><p className="text-xs text-slate-500">Sessões autorizadas com pedido enviado</p><p className="mt-1 text-2xl font-semibold text-brand-900">{stats.request_session_rate === null ? '—' : `${stats.request_session_rate}%`}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{['whatsapp_click', 'quote_click', 'signup_click', 'quote_submitted'].map((kind) => <div key={kind} className="rounded-xl border border-[#eceee5] p-4"><p className="text-xs text-slate-500">{names[kind]}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-brand-950">{number(data.actions.find((row) => row.kind === kind)?.count || 0)}</p></div>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">Cliques WhatsApp não confirmam mensagens enviadas. Pedidos e registos são confirmações do navegador, não um registo financeiro ou auditoria de vendas. Os registos de conta só são atribuídos quando houve uma visita pública consentida na mesma sessão.</p></section>
    <aside className="flex items-start gap-3 rounded-2xl bg-[#edf1e7] p-5 text-xs leading-6 text-slate-600"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-brand-800" /><div><p className="font-semibold text-brand-900">Medição limitada e transparente</p><p>Contagens públicas agregadas sem identificação, armazenamento de identificadores ou ligação entre visitas. Apenas a análise detalhada autorizada usa identificadores aleatórios no navegador (visitante: 30 dias; sessão: 30 minutos), origens e formatos de ecrã. Sem nomes, emails, IPs, mensagens, URLs privadas ou parâmetros de consulta na base de dados analítica. Janela de análise de 90 dias. A limpeza diária de eventos antigos é acionada pela recolha/consulta; sem atividade aguarda a próxima execução. Visitantes são estimativas, não pessoas identificadas.</p><p>Administração e páginas privadas do BrandDesk não geram visualizações. Sinais Do Not Track/GPC são respeitados e agentes automatizados conhecidos são filtrados, mas bloqueadores e bots não detetados podem afetar os totais. Staging não é recolhido. Pode desativar toda a medição nas preferências. Origens e UTM source reconhecidos pertencem apenas à amostra autorizada.</p><p>{data.first_event_at ? `Primeiro evento ainda disponível: ${dateLabel(data.first_event_at)}. ` : ''}O dia atual é parcial. Antes desta separação, os totais incluíam apenas eventos autorizados; esse histórico tem cobertura parcial. Não mostramos variação percentual dos totais agregados ao misturar estas coberturas. Comparações da amostra autorizada usam os dias anteriores completos dentro da retenção.</p></div></aside></> : null}
  </div>;
}
