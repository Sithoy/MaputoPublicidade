'use client';

import { useEffect, useState } from 'react';
import { fetchBlobWithAuth } from '@/lib/auth';
import { safeFileUrl } from '@/lib/safe-url';

export function PrivateArtPreview({ url, label = 'Ver ficheiro' }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState('');
  const [pdf, setPdf] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open || !url.startsWith('/api/artwork-files/')) return;
    let active = true; let objectUrl = '';
    setBlobUrl(''); setError('');
    fetchBlobWithAuth(url).then((blob) => {
      if (!active) return;
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error();
      objectUrl = URL.createObjectURL(blob); setPdf(blob.type === 'application/pdf'); setBlobUrl(objectUrl);
    }).catch(() => { if (active) setError('Não foi possível abrir esta arte.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, url]);
  if (!url.startsWith('/api/artwork-files/')) return <a href={safeFileUrl(url)} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-800">{label}</a>;
  return <div className="w-full"><button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="text-sm font-semibold text-brand-800">{open ? 'Fechar arte' : label}</button>{open ? error ? <p role="alert">{error}</p> : !blobUrl ? <p>A carregar arte…</p> : pdf ? <iframe src={blobUrl} title="Prova de arte" sandbox="" className="mt-3 h-96 w-full rounded-xl border" /> :

    <img src={blobUrl} alt="Prova de arte" className="mt-3 max-h-96 max-w-full rounded-xl object-contain" /> : null}</div>;
}
