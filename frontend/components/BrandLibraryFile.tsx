'use client';

import { useEffect, useState } from 'react';
import { FileImage, RefreshCw } from 'lucide-react';
import { downloadWithAuth, fetchBlobWithAuth } from '@/lib/auth';

export function isBrandImage(url: string, mimeType = '', filename = '') {
  return /^image\/(png|jpeg|webp|gif|avif|svg\+xml)$/i.test(mimeType)
    || /\.(png|jpe?g|svg|webp|gif|avif)$/i.test((filename || url).split(/[?#]/)[0]);
}

function privateFile(url: string) {
  return /^\/api\/(brand-assets\/\d+\/file|artwork-files\/\d+)\/$/.test(url.split('?')[0]);
}

export function BrandLibraryThumbnail({ url, name }: { url: string; name: string }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setFailed(false); setSrc('');
    if (!privateFile(url)) { setSrc(url); return; }
    let alive = true; let objectUrl = '';
    const controller = new AbortController();
    fetchBlobWithAuth(url, { signal: controller.signal }).then((blob) => {
      if (!alive) return;
      if (!isBrandImage('', blob.type)) throw new Error('Not an image');
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, retry]);
  return <div className="flex h-32 items-center justify-center bg-[#f4f7f4] p-4">
    {failed ? <div className="text-center text-xs text-[#64736b]"><FileImage className="mx-auto mb-2 h-6 w-6" /><p>Pré-visualização indisponível</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-800"><RefreshCw className="h-3 w-3" />Tentar novamente</button></div> : src ?
      // The object URL carries authorized bytes; Next's server optimizer cannot authenticate this file.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" /> : <p role="status" className="text-xs text-[#64736b]">A carregar imagem…</p>}
  </div>;
}

export function BrandLibraryFileLink({ url, filename, children, className, label }: { url: string; filename: string; children: React.ReactNode; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!privateFile(url)) return <a href={url} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>{children}</a>;
  async function download() {
    setBusy(true); setError('');
    try { await downloadWithAuth(url, filename); }
    catch { setError('Ficheiro indisponível. Se persistir, volte a carregar o material ou contacte a MP.'); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0"><button type="button" onClick={() => void download()} disabled={busy} className={className} aria-label={label} aria-busy={busy}>{busy ? 'A obter ficheiro…' : children}</button>{error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}</div>;
}
