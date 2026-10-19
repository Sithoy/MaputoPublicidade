'use client';

import { useEffect, useState } from 'react';
import { fetchBlobWithAuth } from '@/lib/auth';

export type WhatsAppFile = { name: string; mime_type: string; previewable: boolean };
const safeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function WhatsAppAttachment({ conversationId, messageId, file }: { conversationId: number; messageId: number; file: WhatsAppFile }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    let objectUrl = '';
    setError(''); setUrl('');
    fetchBlobWithAuth(`/api/support-conversations/${conversationId}/attachments/${messageId}/`).then((blob) => {
      if (!active) return;
      if (!safeTypes.includes(blob.type)) throw new Error('Formato não suportado para pré-visualização.');
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (active) setError('Não foi possível abrir o anexo. Pode ter expirado ou ultrapassar 20 MB.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, attempt, conversationId, messageId]);
  return <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
    <p className="break-all text-xs font-medium">Anexo: {file.name}</p>
    {!file.previewable ? <p className="text-xs text-slate-500">Formato ainda não disponível no inbox. Consulte no WhatsApp Business, se usar Coexistence.</p> : <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="text-sm font-semibold text-brand-800">{open ? 'Fechar anexo' : `Visualizar ${file.name}`}</button>
      {open ? <div onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
        {error ? <div role="alert"><p className="text-xs text-red-700">{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 text-sm">Tentar novamente</button></div> : !url ? <p role="status" className="text-sm">A carregar anexo…</p> : <>
          {file.mime_type === 'application/pdf' ? <iframe src={url} title={`Documento ${file.name}`} sandbox="" className="h-[420px] w-full rounded-lg border" /> :

            <img src={url} alt={file.name} className="max-h-[420px] max-w-full rounded-lg object-contain" />}
          <a href={url} download={file.name} className="mt-2 inline-block text-xs font-semibold text-brand-800">Descarregar anexo</a>
        </>}
      </div> : null}
    </>}
  </div>;
}
