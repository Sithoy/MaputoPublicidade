'use client';
import { safeFileUrl } from '@/lib/safe-url';

import { MaterialBriefingSummary } from '@/components/MaterialBriefingSummary';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth, fetchBlobWithAuth } from '@/lib/auth';
import { productionStage } from '@/lib/operational-workflow';
import { orderStatusLabels } from '@/lib/status';
import { OperationalSteps } from './OperationalSteps';
import { OperationalDelivery } from './OperationalDelivery';

type Version = { id: number; version: number; file_name: string; mime_type: string; published_at: string | null; designer_comment: string; client_decision: string; client_comment: string; decision_source: string; reviewer_name: string };
type Job = { reference: string; client_name: string; status: string; order_reference: string | null; scheduled_date: string | null; production_notes: string; items: { material_briefing?: import('@/lib/material-briefing').MaterialBriefing; id: number; description: string; quantity: number; size: string; material: string; colors: string; needs_design?: boolean }[]; versions: Version[] };

function ProofPreview({ job, version }: { job: string; version: Version }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [previewable, setPreviewable] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true; let objectUrl = '';
    setUrl(''); setError('');
    fetchBlobWithAuth(`/api/production/${job}/files/${version.id}/`).then((blob) => {
      if (!active) return;
      setPreviewable(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(blob.type));
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (active) setError('Não foi possível abrir esta arte.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, job, version.id]);
  return <div><button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-sm font-semibold text-brand-800">{open ? 'Fechar arte' : 'Visualizar arte'}</button>{open ? error ? <p role="alert">{error}</p> : !url ? <p>A carregar…</p> : !previewable ? <a href={url} download={version.file_name}>Descarregar arte para consultar</a> : version.mime_type === 'application/pdf' ? <iframe src={url} title={`Arte v${version.version}`} sandbox="" className="mt-3 h-96 w-full rounded-xl border" /> :

    <img src={url} alt={`Arte v${version.version}`} className="mt-3 max-h-96 max-w-full rounded-xl object-contain" /> : null}</div>;
}

export function ProductionWorkspace() {
  const { loading, can } = useAdminAuth();
  const allowed = can('production.view');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<Job | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [share, setShare] = useState<{ url: string; email: string; phone: string; expires: string } | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [filter, setFilter] = useState('active');
  const [optionalArt, setOptionalArt] = useState(false);
  const [deliveryDirty, setDeliveryDirty] = useState(false);
  const unsaved = Boolean(detail && (notes !== detail.production_notes || file || comment || deliveryDirty));
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    fetchWithAuth('/api/production/').then((page: { results: Job[]; next: string | null }) => { if (active) { setJobs(page.results); setNext(page.next); } }).catch(() => { if (active) setError('Não foi possível carregar os trabalhos.'); });
    return () => { active = false; };
  }, [loading, allowed, revision]);
  useEffect(() => {
    setDetail(null); setShare(null); setSection(null); setOptionalArt(false); setDeliveryDirty(false);
    if (!selected || !allowed) return;
    let active = true;
    fetchWithAuth(`/api/production/${selected}/`).then((job: Job) => { if (active) { setDetail(job); setNotes(job.production_notes); } }).catch(() => { if (active) setError('Não foi possível abrir o trabalho.'); });
    return () => { active = false; };
  }, [selected, allowed, revision]);
  async function run(action: 'upload' | 'notes' | 'publish' | 'revoke', version?: Version) {
    if (!detail || busy) return;
    if (action === 'publish' && !window.confirm('Publicar esta arte no BrandDesk e criar um link de revisão válido por 7 dias? Quem receber o link poderá responder. Um novo link invalida o anterior.')) return;
    if (action === 'revoke' && !window.confirm('Revogar os links partilhados desta versão?')) return;
    setBusy(true); setError('');
    try {
      let options: RequestInit = { method: 'POST' };
      if (action === 'upload') {
        if (!file) throw new Error('Escolha uma arte até 3 MB.');
        const data = new FormData(); data.append('file', file); data.append('comment', comment); options.body = data;
      } else options = { ...options, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'notes' ? { notes } : {}) };
      const endpoint = action === 'upload' ? 'artwork/' : action === 'notes' ? 'technical-notes/' : `${action}/${version!.id}/`;
      const result = await fetchWithAuth(`/api/production/${detail.reference}/${endpoint}`, options);
      if (action === 'publish') {
        setDetail(result.job); setShare({ url: `${window.location.origin}${result.review_path}`, email: result.client_email, phone: result.client_phone.replace(/[^0-9]/g, ''), expires: result.expires_at });
      } else { setDetail(result); setShare(null); if (action === 'upload') { setFile(null); setComment(''); } }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); }
  }
  async function more() {
    if (!next || busy) return;
    setBusy(true);
    try { const path = new URL(next, window.location.origin); const page = await fetchWithAuth(path.pathname + path.search); setJobs((current) => [...current, ...page.results]); setNext(page.next); }
    catch { setError('Não foi possível carregar mais trabalhos.'); } finally { setBusy(false); }
  }
  async function advance(status: string) {
    if (!detail?.order_reference || busy) return;
    setBusy(true); setError('');
    try {
      await fetchWithAuth(`/api/orders/${detail.order_reference}/set-status/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setDetail({ ...detail, status }); setSection(null);
      setJobs((rows) => rows.map((job) => job.reference === detail.reference ? { ...job, status } : job));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a produção.'); }
    finally { setBusy(false); }
  }
  if (loading) return <p>A carregar Produção…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso à Produção.</p>;
  const text = share ? `Olá, enviamos a arte para apreciação. Consulte e responda aqui: ${share.url}` : '';
  const needsArt = Boolean(detail && (optionalArt || detail.versions.length || detail.items.some((item) => item.needs_design !== false)));
  const progress = detail ? productionStage(detail.status, needsArt, detail.versions[0]) : null;
  const stages = [{ key: 'brief', label: 'Briefing técnico' }, ...(needsArt ? [{ key: 'art', label: 'Arte e apreciação' }] : []), { key: 'production', label: 'Produzir e conferir' }, { key: 'delivery', label: 'Entrega / instalação' }];
  const activeSection = section || progress?.key || 'brief';
  const visibleJobs = jobs.filter((job) => filter === 'all' || (filter === 'closed' ? ['delivered', 'cancelled'].includes(job.status) : !['delivered', 'cancelled'].includes(job.status)));
  return <div className="mx-auto max-w-6xl space-y-5"><header className="rounded-3xl bg-brand-900 p-7 text-white"><h1 className="text-3xl font-semibold">Produção e Artes</h1><p className="mt-3 text-sm text-white/80">Briefing técnico, versões e decisões sobre artes. Valores, descontos, pagamentos e faturas pertencem à área comercial/financeira.</p><button type="button" disabled={busy || unsaved} onClick={() => setRevision((value) => value + 1)} className="mt-4 rounded-xl border px-4 py-2 text-sm">Atualizar trabalhos</button></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]"><aside className="space-y-2 rounded-2xl border bg-white p-4" aria-label="Trabalhos técnicos"><label className="block text-sm">Mostrar<select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-2 w-full rounded-lg border p-2"><option value="active">Em acompanhamento</option><option value="closed">Concluídos</option><option value="all">Todos</option></select></label><p className="text-xs text-slate-500">Filtro dos trabalhos carregados nesta página.</p>{visibleJobs.map((job) => <button key={job.reference} type="button" disabled={busy} aria-pressed={selected === job.reference} onClick={() => { if (!detail || (!unsaved || window.confirm('Abrir outro trabalho? Guarde primeiro as notas e artes em preparação.'))) { setSelected(job.reference); setFile(null); setComment(''); } }} className="w-full rounded-xl border p-3 text-left"><p className="text-xs text-brand-800">{job.reference}</p><p className="mt-1 font-semibold">{job.client_name}</p><p className="mt-1 text-xs text-slate-500">{job.items[0]?.description || 'Trabalho'} · {orderStatusLabels[job.status] || job.status}</p></button>)}{!visibleJobs.length ? <p className="text-sm">Sem trabalhos publicados ou confirmados.</p> : null}{next ? <button type="button" disabled={busy} onClick={more}>Mais trabalhos</button> : null}</aside>
    <main className="min-w-0 space-y-5 rounded-2xl border bg-white p-5">{!detail ? <p>Abra um trabalho para consultar o briefing técnico e preparar artes.</p> : <><h2 className="text-xl font-semibold">{detail.reference} · {detail.client_name}</h2><p className="text-sm text-slate-500">{detail.order_reference || 'Sem ordem de produção'} · {orderStatusLabels[detail.status] || detail.status}</p><OperationalSteps steps={stages.map((stage) => stage.label)} current={Math.max(0, stages.findIndex((stage) => stage.key === progress?.key))} selected={Math.max(0, stages.findIndex((stage) => stage.key === activeSection))} onSelect={(index) => { if (!unsaved || window.confirm('Existem alterações por guardar. Sair sem guardar?')) { setNotes(detail.production_notes); setDeliveryDirty(false); setFile(null); setComment(''); setSection(stages[index].key); } }} /><div className={`rounded-xl p-4 ${progress?.waiting ? 'bg-amber-50' : 'bg-brand-50'}`}><p className="text-xs font-semibold uppercase">{progress?.waiting ? 'Em espera' : 'Próxima ação'}</p><p className="mt-2 text-sm">{progress?.next}</p></div>
      {detail.order_reference && ['production', 'delivery'].includes(activeSection) && can('orders.manage_status') ? <div className="flex flex-wrap gap-3">{(detail.status === 'approved' ? [['in_production', 'Iniciar produção']] : detail.status === 'in_production' ? [['ready', 'Marcar pronto para entrega']] : detail.status === 'ready' ? [['delivered', 'Registar entrega concluída']] : []).map(([status, label]) => <button key={status} type="button" disabled={busy} onClick={() => advance(status)} className="rounded-xl border px-4 py-3 text-sm font-semibold">{label}</button>)}</div> : null}
      {activeSection === 'brief' ? <section className="space-y-4"><ul className="space-y-2">{detail.items.map((item) => <li key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">{item.quantity} × {item.description}</p><p>{[item.size, item.material, item.colors].filter(Boolean).join(' · ')}</p><MaterialBriefingSummary value={item.material_briefing} /></li>)}</ul>
      <label className="block text-sm font-medium">Notas técnicas da Produção<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border p-3" /></label><button type="button" disabled={busy || notes === detail.production_notes} onClick={() => run('notes')} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">Guardar notas técnicas</button>{!needsArt ? <button type="button" onClick={() => { setOptionalArt(true); setSection('art'); }} className="ml-3 rounded-xl border px-4 py-2 text-sm">Este trabalho precisa de arte</button> : null}</section> : null}
      {activeSection === 'art' && can('quotes.artwork') ? <fieldset disabled={busy} className="space-y-3 rounded-xl border p-4"><legend className="font-semibold">Nova proposta de arte</legend><label className="block text-sm">Imagem ou PDF até 3 MB<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full" /></label><label className="block text-sm">Mensagem sobre a arte<textarea rows={2} maxLength={3000} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label><button type="button" disabled={!file} onClick={() => run('upload')} className="rounded-xl bg-brand-800 px-4 py-3 text-sm text-white disabled:opacity-50">Guardar nova versão em rascunho</button><p className="text-xs text-slate-500">Guardar não envia a arte. Submeta a versão quando estiver pronta para o cliente.</p></fieldset> : null}
      {activeSection === 'art' ? <section className="space-y-3"><h3 className="font-semibold">Versões e apreciação do cliente</h3>{detail.versions.map((version, index) => <article key={version.id} className="space-y-3 rounded-xl border p-4"><p className="font-semibold">v{version.version} · {version.published_at ? version.client_decision : 'Rascunho interno'}</p><p className="text-sm whitespace-pre-wrap">{version.designer_comment}</p><ProofPreview job={detail.reference} version={version} />{version.client_comment ? <p className="rounded-lg bg-brand-50 p-3 text-sm">Cliente: {version.client_comment}</p> : null}{version.decision_source ? <p className="text-xs text-slate-500">Resposta: {version.decision_source === 'shared_link' ? `Link partilhado · nome declarado: ${version.reviewer_name}` : 'BrandDesk autenticado'}</p> : null}{can('quotes.artwork') && index === 0 ? <button type="button" disabled={busy} onClick={() => run('publish', version)} className="rounded-xl bg-brand-800 px-4 py-2 text-sm text-white">{version.published_at ? 'Gerar novo link de partilha' : 'Submeter para apreciação do cliente'}</button> : null}{version.published_at ? <button type="button" disabled={busy} onClick={() => run('revoke', version)} className="ml-3 text-xs underline">Revogar links partilhados</button> : null}</article>)}</section> : null}
      {activeSection === 'art' && share ? <section className="space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-4"><h3 className="font-semibold">Arte publicada no BrandDesk</h3><p className="text-xs">Link válido até {new Date(share.expires).toLocaleString('pt-MZ')}. Quem receber o link pode ver e responder sobre esta arte; não contém dados comerciais. Envio por WhatsApp/email é manual, não automático.</p><label className="block text-sm">Link de revisão<input readOnly value={share.url} className="mt-2 w-full rounded-lg border p-2" /></label><div className="flex flex-wrap gap-4 text-sm">{share.phone ? <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${share.phone}?text=${encodeURIComponent(text)}`}>Preparar mensagem WhatsApp →</a> : null}{share.email ? <a href={`mailto:${share.email}?subject=${encodeURIComponent(`Arte para apreciação · ${detail.reference}`)}&body=${encodeURIComponent(text)}`}>Preparar email →</a> : null}<a href={safeFileUrl(share.url)} target="_blank" rel="noopener noreferrer">Abrir revisão da arte →</a></div></section> : null}
      {activeSection === 'production' ? <section className="rounded-xl border p-4"><h3 className="font-semibold">Executar e conferir</h3><p className="mt-2 text-sm">Confirme quantidades, materiais, acabamento e arte aprovada. Marque pronto apenas após a conferência.</p></section> : null}
      {activeSection === 'delivery' && detail.order_reference ? <div onChangeCapture={() => setDeliveryDirty(true)}><OperationalDelivery key={detail.order_reference} reference={detail.order_reference} onSaved={() => setDeliveryDirty(false)} /></div> : null}
    </>}</main></div></div>;
}
