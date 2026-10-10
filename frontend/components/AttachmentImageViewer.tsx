'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize, X, ZoomIn, ZoomOut } from 'lucide-react';
import { previewRequestAttachment } from '@/lib/client-api';
import { Button } from '@/components/ui/Button';

type ImageAttachment = { id: number; name: string };
export const isImageAttachment = (name: string) => /\.(jpe?g|png|webp)$/i.test(name);

export function AttachmentImageViewer({ reference, files, initialId, onClose }: {
  reference: string; files: ImageAttachment[]; initialId: number; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(() => Math.max(0, files.findIndex((file) => file.id === initialId)));
  const [url, setUrl] = useState('');
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const file = files[index];
  const fileId = file?.id;

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => {
      if (document.fullscreenElement === node) void document.exitFullscreen().catch(() => {});
      node?.close();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl(''); setError(''); setLoading(true); setZoom(100);
    if (fileId === undefined) { setLoading(false); return; }
    previewRequestAttachment(reference, fileId, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Não foi possível abrir a imagem. Verifique o acesso e tente novamente.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reference, fileId, retry]);

  async function fullscreen() {
    try {
      if (document.fullscreenElement === dialog.current) await document.exitFullscreen();
      else await dialog.current?.requestFullscreen();
    } catch { setError('O navegador não permitiu o ecrã inteiro. Pode continuar a usar o zoom.'); }
  }

  return <dialog ref={dialog} aria-labelledby="attachment-viewer-title" onCancel={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setIndex((value) => Math.min(files.length - 1, value + 1)); }
    }} className="m-auto max-h-[95vh] w-[calc(100%_-_2rem)] max-w-5xl overflow-auto rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/70">
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><h2 id="attachment-viewer-title" className="break-all font-semibold">{file?.name || 'Imagem'}</h2><p className="mt-1 text-xs text-slate-500">Imagem {index + 1} de {files.length} · {reference}</p></div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar visualização" autoFocus><X className="h-5 w-5" /></Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} aria-label="Imagem anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="sm" disabled={index === files.length - 1} onClick={() => setIndex((value) => value + 1)} aria-label="Imagem seguinte"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!url || zoom <= 100} onClick={() => setZoom((value) => value - 50)} aria-label="Reduzir zoom"><ZoomOut className="h-4 w-4" /></Button>
          <span className="text-sm" aria-live="polite">{zoom}%</span>
          <Button type="button" variant="outline" size="sm" disabled={!url || zoom >= 300} onClick={() => setZoom((value) => value + 50)} aria-label="Aumentar zoom"><ZoomIn className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="sm" disabled={!url} onClick={() => setZoom(100)}>Ajustar</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void fullscreen()} aria-label="Alternar ecrã inteiro"><Maximize className="h-4 w-4" /></Button>
        </div>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></p> : null}
      <div className="max-h-[68vh] min-h-40 overflow-auto rounded-xl bg-slate-100 p-2">
        {loading ? <p role="status" className="p-8 text-center text-sm">A abrir imagem…</p> : null}
        {/* Private authenticated blob, not a public or optimisable image URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={file?.name || 'Anexo'} className="mx-auto block object-contain" style={{ width: `${zoom}%`, maxWidth: 'none', maxHeight: zoom === 100 ? '65vh' : undefined }} onError={() => setError('O navegador não conseguiu apresentar esta imagem.')} /> : null}
      </div>
    </div>
  </dialog>;
}
