'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RequestReviewLink } from '@/components/RequestReviewLink';

type Art = { files?: { id: number; name: string; mime_type: string; url: string }[]; reference: string; version: number; file_name: string; mime_type: string; file_url: string; designer_comment: string; client_decision: string; client_comment: string; current: boolean };
export default function ArtReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [art, setArt] = useState<Art | null>(null);
  const [fileIndex, setFileIndex] = useState(0);
  const [url, setUrl] = useState('');
  const [pdf, setPdf] = useState(false);
  const [previewable, setPreviewable] = useState(false);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [expired, setExpired] = useState(false);
  const endpoint = `/api/art-review/${encodeURIComponent(token)}/`;
  useEffect(() => {
    let active = true; let objectUrl = '';
    setArt(null); setUrl(''); setError(''); setExpired(false);
    async function load() {
      const response = await fetch(endpoint, { cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        if (active) setExpired(failure.code === 'link_expired');
        throw new Error(failure.code === 'link_expired' ? 'Este link expirou. Os ficheiros continuam privados.' : 'Este link é inválido ou foi substituído ou revogado. Contacte a MP.');
      }
      const data: Art = await response.json();
      if (!active) return;
      setArt(data);
      const file = await fetch(data.files?.[fileIndex]?.url || data.file_url, { cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!file.ok) throw new Error('Não foi possível consultar a arte.');
      const blob = await file.blob();
      if (!active) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); setPdf(blob.type === 'application/pdf');
      setPreviewable(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(blob.type));
    }
    void load().catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a arte.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [endpoint, revision, fileIndex]);
  async function decide(decision: 'approved' | 'changes_requested') {
    if (busy || !confirmed || !name.trim() || (decision === 'changes_requested' && !comment.trim())) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, name, comment }), cache: 'no-store', referrerPolicy: 'no-referrer' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Não foi possível registar a decisão. Atualize a página ou contacte a MP.');
      setNotice(data.detail); setConfirmed(false); setRevision((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível registar a decisão.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-4xl space-y-5"><header className="rounded-3xl bg-brand-900 p-7 text-white"><p className="text-xs uppercase tracking-widest text-brand-200">Maputo Publicidade · Apreciação da arte</p><h1 className="mt-3 text-3xl font-semibold">Vamos confirmar os detalhes.</h1><p className="mt-3 text-sm text-white/80">A sua decisão aplica-se apenas à arte apresentada. Não aprova preços, pagamentos ou uma proposta comercial.</p></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}{notice ? <p role="status" className="rounded-xl bg-brand-50 p-4">{notice}</p> : null}
    {expired ? <RequestReviewLink key={token} request={async () => { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_link' }), cache: 'no-store', referrerPolicy: 'no-referrer' }); if (!response.ok) throw new Error(); return response.json(); }} /> : null}
    {art ? <section className="space-y-5 rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">{art.reference} · Arte v{art.version}</h2><p className="whitespace-pre-wrap text-sm">{art.designer_comment}</p>{(art.files?.length || 0) > 1 ? <nav aria-label="Ficheiros desta versão" className="flex flex-wrap gap-2">{art.files!.map((file, index) => <button key={file.id} type="button" aria-pressed={index === fileIndex} onClick={() => { setFileIndex(index); setConfirmed(false); }} className={`rounded-xl border px-3 py-2 text-sm ${index === fileIndex ? "bg-brand-800 text-white" : ""}`}>{index + 1}. {file.name}</button>)}</nav> : null}<p className="text-sm font-semibold">{art.files?.[fileIndex]?.name || art.file_name}</p>{!url ? <p>A carregar ficheiro…</p> : previewable ? pdf ? <iframe src={url} title={`Arte v${art.version}`} sandbox="" className="h-[540px] w-full rounded-xl border" /> :

      <img src={url} alt={`Arte v${art.version}`} className="max-h-[650px] max-w-full rounded-xl object-contain" /> : <a href={url} download={art.files?.[fileIndex]?.name || art.file_name}>Descarregar arte para consultar</a>}
      {!art.current ? <p className="rounded-xl bg-amber-50 p-4 text-sm">Existe uma versão mais recente. Peça o link atual antes de responder.</p> : art.client_decision !== 'pending' ? <p className="rounded-xl bg-brand-50 p-4 text-sm">Decisão registada: {art.client_decision === 'approved' ? 'Arte aprovada' : 'Alterações solicitadas'}. {art.client_comment}</p> : <fieldset disabled={busy} className="space-y-4"><label className="block text-sm">O seu nome<input value={name} onChange={(event) => { setName(event.target.value); setConfirmed(false); }} maxLength={160} className="mt-2 w-full rounded-xl border p-3" /></label><label className="block text-sm">Comentário ou alterações pretendidas<textarea value={comment} onChange={(event) => { setComment(event.target.value); setConfirmed(false); }} rows={3} maxLength={3000} className="mt-2 w-full rounded-xl border p-3" /></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Consultei todos os ficheiros desta versão e tenho autorização para responder pelo cliente.</label><div className="flex flex-wrap gap-3"><button type="button" disabled={!confirmed || !name.trim() || !url} onClick={() => decide('approved')} className="rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Aprovar esta versão</button><button type="button" disabled={!confirmed || !name.trim() || !comment.trim() || !url} onClick={() => decide('changes_requested')} className="rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-50">Pedir alterações</button></div><p className="text-xs text-slate-500">Este link permite responder sem iniciar sessão. O nome é declarado por quem responde; para uma decisão associada à sua conta, utilize o BrandDesk.</p></fieldset>}
    </section> : !error ? <p>A abrir revisão…</p> : null}</div></main>;
}
