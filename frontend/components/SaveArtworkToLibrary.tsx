'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveApprovedArtwork } from '@/lib/client-api';

export function SaveArtworkToLibrary({ versionId, disabled = false, showLibraryLink = true }: { versionId: number; disabled?: boolean; showLibraryLink?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (busy || disabled || !window.confirm('Guardar a versão aprovada na Biblioteca para futuros pedidos? Esta aprovação aplica-se apenas ao trabalho original.')) return;
    setBusy(true); setError('');
    try { await saveApprovedArtwork(versionId); setSaved(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar a arte.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">{saved ? <p role="status" className="text-sm text-brand-800">Arte guardada na Biblioteca do cliente. {showLibraryLink ? <Link href="/area-cliente/marca" className="underline">Consultar no BrandDesk</Link> : null}</p> : <button type="button" disabled={busy || disabled} onClick={() => void save()} className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 disabled:opacity-50">{busy ? 'A guardar…' : 'Guardar arte aprovada na Biblioteca'}</button>}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}</div>;
}
