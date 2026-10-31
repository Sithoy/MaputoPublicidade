'use client';
import { ReviewShareActions } from './ReviewShareActions';

import { SaveArtworkToLibrary } from '@/components/SaveArtworkToLibrary';
import { SharedJobBriefing } from './SharedJobBriefing';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth, fetchBlobWithAuth } from '@/lib/auth';
import { productionStage } from '@/lib/operational-workflow';
import { orderStatusLabels } from '@/lib/status';
import { OperationalSteps } from './OperationalSteps';
import { OperationalDelivery } from './OperationalDelivery';
import { StudioRequirements } from './StudioRequirements';
import Link from 'next/link';

type ArtFile = { id: number; name: string; mime_type: string; url: string };
type Version = { files?: ArtFile[]; id: number; version: number; file_name: string; mime_type: string; published_at: string | null; designer_comment: string; client_decision: string; client_comment: string; decision_source: string; reviewer_name: string };
export type Job = { briefing?: import('@/lib/reception-api').ReceptionBriefing; references?: { id: number; name: string; size: number; library_origin?: import('@/lib/api').LibraryOrigin }[]; operation?: { stage: string; label: string; needs_art: boolean; art_ready: boolean; can_start: boolean }; artwork_routes?: { item_id: number; requirement: string }[]; reference: string; client_name: string; status: string; order_reference: string | null; scheduled_date: string | null; production_notes: string; items: { material_briefing?: import('@/lib/material-briefing').MaterialBriefing; id: number; description: string; notes?: string; quantity: number; size: string; material: string; colors: string; needs_design?: boolean }[]; versions: Version[] };

function ProofPreview({ job, version, file }: { job: string; version: Version; file?: ArtFile }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [previewable, setPreviewable] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true; let objectUrl = '';
    setUrl(''); setError('');
    fetchBlobWithAuth(file?.url || `/api/production/${job}/files/${version.id}/`).then((blob) => {
      if (!active) return;
      setPreviewable(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(blob.type));
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (active) setError('Não foi possível abrir esta arte.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, job, version.id, file?.url]);
  return <div><button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-sm font-semibold text-brand-800">{open ? 'Fechar arte' : file ? `Visualizar ${file.name}` : 'Visualizar arte'}</button>{open ? error ? <p role="alert">{error}</p> : !url ? <p>A carregar…</p> : !previewable ? <a href={url} download={file?.name || version.file_name}>Descarregar arte para consultar</a> : (file?.mime_type || version.mime_type) === 'application/pdf' ? <iframe src={url} title={`Arte v${version.version}`} sandbox="" className="mt-3 h-96 w-full rounded-xl border" /> :

    <img src={url} alt={`Arte v${version.version}`} className="mt-3 max-h-96 max-w-full rounded-xl object-contain" /> : null}{url && previewable ? <a href={url} download={file?.name || version.file_name} className="mt-3 block text-sm font-semibold underline">Descarregar arte para anexar ao WhatsApp</a> : null}</div>;
}

export function ProductionWorkspace({ workspace = 'production', initialReference = '', onClose }: { workspace?: 'production' | 'studio'; initialReference?: string; onClose?: () => void }) {
  const { loading, can } = useAdminAuth();
  const allowed = can('production.view') && (workspace !== 'studio' || can('quotes.artwork'));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState(initialReference);
  const [detail, setDetail] = useState<Job | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [share, setShare] = useState<{ url: string; email: string; phone: string; expires: string } | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [filter, setFilter] = useState('active');
  const [studioDirty, setStudioDirty] = useState(false);
  const [studioReset, setStudioReset] = useState(0);
  const [notice, setNotice] = useState('');
  const [phoneContact, setPhoneContact] = useState('');
  const [phoneNote, setPhoneNote] = useState('');
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [phoneDecision, setPhoneDecision] = useState('approved');
  const [deliveryDirty, setDeliveryDirty] = useState(false);
  const unsaved = Boolean(detail && (notes !== detail.production_notes || files.length || comment || deliveryDirty || studioDirty || phoneContact || phoneNote));
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  useEffect(() => {
    if (loading || !allowed || onClose) return;
    let active = true;
    fetchWithAuth('/api/production/').then((page: { results: Job[]; next: string | null }) => { if (active) { setJobs(page.results); setNext(page.next); } }).catch(() => { if (active) setError('Não foi possível carregar os trabalhos.'); });
    return () => { active = false; };
  }, [loading, allowed, revision, onClose]);
  useEffect(() => {
    setDetail(null); setShare(null); setSection(null); setStudioDirty(false); setPhoneContact(''); setPhoneNote(''); setPhoneConfirmed(false); setDeliveryDirty(false);
    if (!selected || !allowed) return;
    let active = true;
    fetchWithAuth(`/api/production/${selected}/`).then((job: Job) => { if (active) { setDetail(job); setNotes(job.production_notes); } }).catch(() => { if (active) setError('Não foi possível abrir o trabalho.'); });
    return () => { active = false; };
  }, [selected, allowed, revision]);
  async function run(action: 'upload' | 'notes' | 'publish' | 'revoke' | 'email' | 'decision', version?: Version) {
    if (!detail || busy) return;
    if (studioDirty && action !== 'notes') { setError('Guarde os requisitos de arte antes de continuar.'); return; }
    if (action === 'decision' && !window.confirm('Registar esta decisão para a versão atual em nome do cliente? O seu nome ficará registado.')) return;
    if (action === 'publish' && !window.confirm('Publicar esta arte no BrandDesk e criar um link de revisão válido por 7 dias? Quem receber o link poderá responder. Um novo link invalida o anterior.')) return;
    if (action === 'revoke' && !window.confirm('Revogar os links partilhados desta versão?')) return;
    setBusy(true); setError('');
    try {
      let options: RequestInit = { method: 'POST' };
      if (action === 'upload') {
        if (!files.length || files.length > 5 || files.some((file) => !file.size || file.size > 5 * 1024 * 1024)) throw new Error('Selecione até 5 ficheiros, com conteúdo e até 5 MB cada.');
        const data = new FormData(); files.forEach((file) => data.append('files', file)); data.append('comment', comment); options.body = data;
      } else options = { ...options, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'notes' ? { notes } : action === 'decision' ? { version_id: version!.id, decision: phoneDecision, contact_name: phoneContact, comment: phoneNote, confirmed: phoneConfirmed } : {}) };
      const endpoint = action === 'upload' ? 'artwork/' : action === 'notes' ? 'technical-notes/' : action === 'decision' ? 'decision/' : `${action}/${version!.id}/`;
      const result = await fetchWithAuth(`/api/production/${detail.reference}/${endpoint}`, options);
      if (action !== 'email') { const job = action === 'publish' ? result.job : result; setJobs((rows) => rows.map((row) => row.reference === job.reference ? job : row)); }
      if (action === 'email') { setNotice(result.detail); }
      else if (action === 'publish') {
        setDetail(result.job); setShare({ url: `${window.location.origin}${result.review_path}`, email: result.client_email, phone: result.client_phone.replace(/[^0-9]/g, ''), expires: result.expires_at });
      } else { setDetail(result); setShare(null); if (action === 'decision') { setPhoneContact(''); setPhoneNote(''); setPhoneConfirmed(false); } if (action === 'upload') { setFiles([]); setComment(''); } }
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
      const fresh = await fetchWithAuth(`/api/production/${detail.reference}/`);
      setDetail(fresh); setSection(null);
      setJobs((rows) => rows.map((job) => job.reference === detail.reference ? fresh : job));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a produção.'); }
    finally { setBusy(false); }
  }
  if (loading) return <p>A carregar Produção…</p>;
  if (!allowed) return <p role="alert">A sua função não tem acesso à Produção.</p>;
  const needsArt = Boolean(detail && (workspace === 'studio' || detail.operation?.needs_art || detail.versions.length || detail.items.some((item) => Boolean(item.needs_design))));
  const progress = detail ? productionStage(detail.status, needsArt, detail.operation && !detail.operation.art_ready && detail.versions[0]?.client_decision === 'approved' ? undefined : detail.versions[0]) : null;
  const stages = [...(needsArt ? [{ key: 'art', label: 'Arte e apreciação' }] : []), { key: 'production', label: 'Produzir e conferir' }, { key: 'delivery', label: 'Entrega / instalação' }];
  const activeSection = section || (workspace === 'studio' ? 'art' : progress?.key) || 'brief';
  const workspaceJobs = jobs.filter((job) => !job.operation || filter === 'all' || (workspace === 'studio' ? (filter === 'closed' ? job.operation.needs_art : ['studio', 'client_art', 'ready'].includes(job.operation.stage) && job.operation.needs_art) : !['studio', 'client_art'].includes(job.operation.stage)));
  const visibleJobs = workspaceJobs.filter((job) => filter === 'all' || (filter === 'closed' ? ['delivered', 'cancelled'].includes(job.status) : !['delivered', 'cancelled'].includes(job.status)));
  return <div className="mx-auto max-w-6xl space-y-5">{onClose ? <button type="button" disabled={busy} onClick={() => { if (!unsaved || window.confirm('Sair do trabalho sem guardar as alterações?')) onClose(); }} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-brand-900">← Voltar à agenda do Studio</button> : <header className="rounded-3xl bg-brand-900 p-7 text-white"><h1 className="text-3xl font-semibold">{workspace === 'studio' ? 'Studio · Da ideia à arte aprovada' : 'Operações · Produção e entrega'}</h1><p className="mt-3 text-sm text-white/80">Um briefing partilhado, versões e decisões sobre artes. Valores, descontos, pagamentos e faturas pertencem à área comercial/financeira.</p><button type="button" disabled={busy || unsaved} onClick={() => setRevision((value) => value + 1)} className="mt-4 rounded-xl border px-4 py-2 text-sm">Atualizar trabalhos</button><nav aria-label="Áreas operacionais" className="mt-5 flex gap-4 text-sm font-semibold"><Link href="/admin/studio">Studio · Artes</Link><Link href="/admin/producao">Produção</Link></nav></header>}
    {notice ? <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm">{notice}</p> : null}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}
    <div className={onClose ? '' : 'grid gap-5 lg:grid-cols-[280px_1fr]'}>{!onClose ? <aside className="space-y-2 rounded-2xl border bg-white p-4" aria-label="Trabalhos técnicos"><label className="block text-sm">Mostrar<select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-2 w-full rounded-lg border p-2"><option value="active">Em acompanhamento</option><option value="closed">Concluídos</option><option value="all">Todos</option></select></label><p className="text-xs text-slate-500">Filtro dos trabalhos carregados nesta página.</p>{visibleJobs.map((job) => <button key={job.reference} type="button" disabled={busy} aria-pressed={selected === job.reference} onClick={() => { if (!detail || (!unsaved || window.confirm('Abrir outro trabalho? Guarde primeiro as notas e artes em preparação.'))) { setSelected(job.reference); setFiles([]); setComment(''); } }} className="w-full rounded-xl border p-3 text-left"><p className="text-xs text-brand-800">{job.reference}</p><p className="mt-1 font-semibold">{job.client_name}</p><p className="mt-1 text-xs text-slate-500">{job.items[0]?.description || 'Trabalho'} · {job.operation?.label || orderStatusLabels[job.status] || job.status}</p></button>)}{!visibleJobs.length ? <p className="text-sm">Sem trabalhos publicados ou confirmados.</p> : null}{next ? <button type="button" disabled={busy} onClick={more}>Mais trabalhos</button> : null}</aside> : null}
    <main className="min-w-0 space-y-5 rounded-2xl border bg-white p-5">{!detail ? <p>Abra um trabalho para consultar o briefing do pedido e preparar artes.</p> : <><h2 className="text-xl font-semibold">{detail.reference} · {detail.client_name}</h2><p className="text-sm text-slate-500">{detail.order_reference || 'Sem ordem de produção'} · {detail.operation?.label || orderStatusLabels[detail.status] || detail.status}</p><button type="button" disabled={busy} aria-expanded={activeSection === 'brief'} onClick={() => { if (!unsaved || window.confirm('Existem alterações por guardar. Consulte o briefing depois de guardar ou confirme para continuar.')) setSection(activeSection === 'brief' ? null : 'brief'); }} className="rounded-xl border px-4 py-2 text-sm font-semibold">{activeSection === 'brief' ? 'Voltar ao trabalho' : 'Consultar briefing e referências'}</button><OperationalSteps steps={stages.map((stage) => stage.label)} current={Math.max(0, stages.findIndex((stage) => stage.key === progress?.key))} selected={Math.max(0, stages.findIndex((stage) => stage.key === activeSection))} onSelect={(index) => { if (!unsaved || window.confirm('Existem alterações por guardar. Sair sem guardar?')) { setNotes(detail.production_notes); setDeliveryDirty(false); setFiles([]); setComment(''); setStudioDirty(false); setStudioReset((value) => value + 1); setPhoneContact(''); setPhoneNote(''); setPhoneConfirmed(false); setSection(stages[index].key); } }} /><div className={`rounded-xl p-4 ${progress?.waiting ? 'bg-amber-50' : 'bg-brand-50'}`}><p className="text-xs font-semibold uppercase">{progress?.waiting ? 'Em espera' : 'Próxima ação'}</p><p className="mt-2 text-sm">{progress?.next}</p></div>
      {workspace === 'production' && detail.order_reference && ['production', 'delivery'].includes(activeSection) && can('orders.manage_status') ? <div className="flex flex-wrap gap-3">{(detail.status === 'approved' ? [['in_production', 'Iniciar produção']] : detail.status === 'in_production' ? [['ready', 'Marcar pronto para entrega']] : detail.status === 'ready' ? [['delivered', 'Registar entrega concluída']] : []).map(([status, label]) => <button key={status} type="button" disabled={busy || (status === 'in_production' && (detail.operation ? !detail.operation.can_start : needsArt && (!detail.versions[0]?.published_at || detail.versions[0]?.client_decision !== 'approved')))} onClick={() => advance(status)} className="rounded-xl border px-4 py-3 text-sm font-semibold">{label}</button>)}</div> : null}
      {activeSection === 'brief' ? <section className="space-y-4"><SharedJobBriefing job={detail} />
      <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Notas de execução (opcional)</summary><p className="mt-2 text-xs text-slate-500">Complementos internos para executar o trabalho. O briefing permanece o da Recepção.</p><label className="mt-3 block text-sm font-medium">Notas de execução<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border p-3" /></label><button type="button" disabled={busy || notes === detail.production_notes} onClick={() => run('notes')} className="mt-3 rounded-xl border px-4 py-2 text-sm disabled:opacity-50">Guardar notas de execução</button></details></section> : null}
      {activeSection === 'art' && can('quotes.artwork') ? <StudioRequirements key={`${detail.reference}:${studioReset}`} job={detail} disabled={busy || !['approved', 'quoted'].includes(detail.status)} onSaved={(job) => { setDetail(job); setJobs((rows) => rows.map((row) => row.reference === job.reference ? job : row)); }} onDirty={setStudioDirty} onBusy={setBusy} /> : null}
      {activeSection === 'art' && can('quotes.artwork') ? <fieldset disabled={busy || studioDirty || !['approved', 'quoted'].includes(detail.status)} className="space-y-3 rounded-xl border p-4"><legend className="font-semibold">Nova proposta de arte</legend><label className="block text-sm">Ficheiros da versão (até 5, 5 MB cada)<input key={detail.versions[0]?.id || 0} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => { const picked = Array.from(event.target.files || []); if (picked.length > 5 || picked.some((file) => !file.size || file.size > 5 * 1024 * 1024)) { setError("Selecione até 5 ficheiros, com conteúdo e até 5 MB cada."); event.target.value = ""; setFiles([]); return; } setError(""); setFiles(picked); }} className="mt-2 block w-full" /></label><ul className="space-y-1 text-xs text-slate-600">{files.map((file, index) => <li key={index}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB <button type="button" onClick={() => setFiles((current) => current.filter((_, position) => position !== index))} aria-label={`Remover ${file.name}`} className="ml-2 underline">Remover</button></li>)}</ul><label className="block text-sm">Mensagem sobre a arte<textarea rows={2} maxLength={3000} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label><button type="button" disabled={!files.length} onClick={() => run('upload')} className="rounded-xl bg-brand-800 px-4 py-3 text-sm text-white disabled:opacity-50">Guardar nova versão em rascunho</button><p className="text-xs text-slate-500">Todos os ficheiros formam uma versão, aprovada em conjunto. Guardar não envia; submeta quando estiver pronta. PDF, PNG, JPEG ou WebP.</p></fieldset> : null}
      {activeSection === 'art' ? <section className="space-y-3"><h3 className="font-semibold">Versões e apreciação do cliente</h3>{detail.versions.map((version, index) => <article key={version.id} className="space-y-3 rounded-xl border p-4"><p className="font-semibold">v{version.version} · {version.published_at ? version.client_decision : 'Rascunho interno'}</p><p className="text-sm whitespace-pre-wrap">{version.designer_comment}</p><div className="space-y-3">{version.files?.length ? version.files.map((file) => <ProofPreview key={file.id} job={detail.reference} version={version} file={file} />) : <ProofPreview job={detail.reference} version={version} />}</div>{(version.files?.length || 0) > 1 ? <p className="text-xs text-slate-500">A aprovação abrange todos os ficheiros. Guardar na Biblioteca arquiva apenas o primeiro ficheiro.</p> : null}{index === 0 && version.published_at && version.client_decision === 'approved' && can('quotes.artwork') ? <SaveArtworkToLibrary key={version.id} versionId={version.id} disabled={busy} showLibraryLink={false} /> : null}{version.client_comment ? <p className="rounded-lg bg-brand-50 p-3 text-sm">Cliente: {version.client_comment}</p> : null}{version.decision_source ? <p className="text-xs text-slate-500">Resposta: {version.decision_source === 'shared_link' ? `Link partilhado · nome declarado: ${version.reviewer_name}`  : version.decision_source === 'phone' ? `Telefone · contacto: ${version.reviewer_name}` : 'BrandDesk autenticado'}</p> : null}{can('quotes.artwork') && index === 0 ? <button type="button" disabled={busy} onClick={() => run('publish', version)} className="rounded-xl bg-brand-800 px-4 py-2 text-sm text-white">{version.published_at ? 'Gerar novo link de partilha' : 'Submeter para apreciação do cliente'}</button> : null}{version.published_at && index === 0 ? <button type="button" disabled={busy} onClick={() => run('email', version)} className="ml-3 rounded-xl border px-4 py-2 text-sm">Preparar envio por atendimento</button> : null}{version.published_at ? <button type="button" disabled={busy} onClick={() => run('revoke', version)} className="ml-3 text-xs underline">Revogar links partilhados</button> : null}</article>)}</section> : null}
      {activeSection === 'art' && share ? <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm">Arte publicada no BrandDesk. Valide a mensagem abaixo antes de partilhar.</p> : null}
      {activeSection === 'art' && detail.versions[0]?.published_at && detail.versions[0].client_decision === 'pending' && can('quotes.artwork') ? <section className="space-y-3 rounded-2xl border bg-brand-50 p-5"><h3 className="font-semibold">Partilhar arte · {detail.reference} · v{detail.versions[0].version}</h3><ReviewShareActions key={`${detail.reference}:${detail.versions[0].id}`} endpoint={`/api/production/${detail.reference}/share/${detail.versions[0].id}/`} version={detail.versions[0].version} disabled={busy || studioDirty} /></section> : null}
      {activeSection === 'art' && detail.versions[0]?.published_at && detail.versions[0].client_decision === 'pending' && can('quotes.artwork') ? <form onSubmit={(event) => { event.preventDefault(); void run('decision', detail.versions[0]); }} className="space-y-4 rounded-xl border p-4"><h3 className="font-semibold">Registar decisão por telefone</h3><fieldset disabled={busy} className="space-y-3"><label className="block text-sm">Nome do contacto<input required maxLength={160} value={phoneContact} onChange={(event) => setPhoneContact(event.target.value)} className="mt-2 block w-full rounded-lg border p-3" /></label><label className="block text-sm">Decisão da arte<select value={phoneDecision} onChange={(event) => { setPhoneDecision(event.target.value); setPhoneConfirmed(false); }} className="ml-3 rounded-lg border p-2"><option value="approved">Aprovar a arte</option><option value="changes_requested">Pedir alterações</option></select></label><label className="block text-sm">Confirmação obtida<textarea required maxLength={3000} value={phoneNote} onChange={(event) => setPhoneNote(event.target.value)} className="mt-2 block w-full rounded-lg border p-3" /></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={phoneConfirmed} onChange={(event) => setPhoneConfirmed(event.target.checked)} />Confirmo a decisão para a versão atual.</label><button disabled={!phoneConfirmed} className="desk-primary rounded-xl px-4 py-3 text-sm text-white">Registar decisão da arte</button></fieldset></form> : null}
      {workspace === 'studio' && detail.operation?.can_start ? <section className="rounded-xl border border-brand-200 bg-brand-50 p-5"><h3 className="font-semibold">Pronto para produção</h3><p className="mt-2 text-sm">A arte atual está aprovada. A equipa de Produção pode conferir o trabalho e iniciar a execução.</p><Link href="/admin/producao" className="mt-3 inline-block rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Abrir Produção →</Link></section> : null}
      {activeSection === 'production' ? <section className="rounded-xl border p-4"><h3 className="font-semibold">Executar e conferir</h3><p className="mt-2 text-sm">Confirme quantidades, materiais, acabamento e arte aprovada. Marque pronto apenas após a conferência.</p></section> : null}
      {activeSection === 'delivery' && detail.order_reference ? <div onChangeCapture={() => setDeliveryDirty(true)}><OperationalDelivery key={detail.order_reference} reference={detail.order_reference} onSaved={() => setDeliveryDirty(false)} /></div> : null}
    </>}</main></div></div>;
}
