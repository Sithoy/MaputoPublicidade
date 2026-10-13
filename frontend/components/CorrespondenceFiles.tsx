'use client';

import { useEffect, useState } from 'react';
import { fetchBlobWithAuth, fetchWithAuth } from '@/lib/auth';

export type CorrespondenceFile = { id: number; name: string; mime_type: string; size: number; url: string };

export function CorrespondenceFilePreview({ file }: { file: CorrespondenceFile }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let alive = true; let objectUrl = '';
    setError(''); setUrl('');
    fetchBlobWithAuth(file.url).then((blob) => {
      if (!alive) return;
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error();
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (alive) setError('Não foi possível abrir o anexo.'); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, file.url]);
  return <div className="mt-3 rounded-xl border bg-white p-3"><button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="break-all text-xs font-semibold text-brand-800">{open ? 'Fechar' : 'Visualizar'} {file.name} · {(file.size / 1024).toFixed(0)} KB</button>{open && <div className="mt-3">{error ? <p role="alert" className="text-xs text-red-700">{error}</p> : !url ? <p role="status">A abrir anexo…</p> : <>{file.mime_type === 'application/pdf' ? <iframe title={`Anexo ${file.name}`} src={url} sandbox="" className="h-[420px] w-full border" /> :
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={file.name} src={url} className="max-h-[420px] max-w-full object-contain" />}<a href={url} download={file.name} className="mt-2 inline-block text-xs text-brand-800 underline">Descarregar</a></>}</div>}</div>;
}

export function CorrespondenceFiles({ conversationId, ids, onChange, disabled = false, onBusyChange, staff = false, refreshKey = 0 }: { conversationId: number; ids: number[]; onChange: (ids: number[]) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void; staff?: boolean; refreshKey?: number }) {
  const [rows, setRows] = useState<CorrespondenceFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<{ key: string; label: string }[]>([]);
  const [source, setSource] = useState('');
  const base = `/api/support-conversations/${conversationId}/files/`;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { let alive = true; setRows([]); fetchWithAuth(base).then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); }).catch(() => { if (alive) setError('Não foi possível carregar os anexos.'); }); return () => { alive = false; }; }, [base, refreshKey]);
  useEffect(() => { if (!staff) return; let alive = true; fetchWithAuth(`/api/support-conversations/${conversationId}/documents/`).then((data) => { if (alive) setDocuments(Array.isArray(data) ? data : []); }).catch(() => { if (alive) setDocuments([]); }); return () => { alive = false; }; }, [staff, conversationId, refreshKey]);
  async function attachDocument() {
    setBusy(true); setError('');
    try {
      const row: CorrespondenceFile = await fetchWithAuth(`/api/support-conversations/${conversationId}/documents/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source }) });
      setRows((current) => [row, ...current]); onChange([...ids, row.id]); setSource('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível selecionar o documento.'); }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    if (file.size > 3 * 1024 * 1024) { setError('Limite de 3 MB por ficheiro.'); return; }
    setBusy(true); setError('');
    try {
      const form = new FormData(); form.append('file', file);
      const row: CorrespondenceFile = await fetchWithAuth(base, { method: 'POST', body: form });
      setRows((current) => [row, ...current]); onChange([...ids, row.id]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível anexar.'); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={disabled || busy} className="my-4 rounded-xl border p-3"><legend className="px-1 text-xs font-semibold text-brand-800">Anexos da mensagem</legend><p className="mb-3 text-[11px] text-slate-500">PDF, JPG, PNG ou WebP · até 3 anexos · 3 MB cada / 6 MB no total. Anexar uma arte não regista aprovação do cliente.</p>{error && <p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}<label className="block text-xs">{busy ? 'A anexar…' : 'Anexar ficheiro'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={ids.length >= 3} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file); }} className="mt-2 block max-w-full text-xs" /></label>{staff && documents.length > 0 && <div className="mt-3 flex flex-wrap gap-2"><select aria-label="Documento do pedido" value={source} onChange={(event) => setSource(event.target.value)} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-xs"><option value="">Selecionar documento aprovado…</option>{documents.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select><button type="button" disabled={!source || ids.length >= 3} onClick={() => void attachDocument()} className="rounded-lg border bg-white px-3 text-xs">Anexar documento</button></div>}{rows.map((row) => <div key={row.id} className="mt-3"><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={ids.includes(row.id)} disabled={!ids.includes(row.id) && ids.length >= 3} onChange={(event) => onChange(event.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id))} /><span className="break-all">Incluir {row.name}</span></label><CorrespondenceFilePreview file={row} /></div>)}</fieldset>;
}
