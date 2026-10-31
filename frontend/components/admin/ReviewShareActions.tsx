'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/auth';

type Share = { expired: boolean; detail?: string; message?: string; link?: string; expires_at?: string; whatsapp_number?: string };

/** Every copy/open revalidates on the server, even if this panel has been open for days. */
export function ReviewShareActions({ endpoint, version, proposal = false, disabled = false, reminder = false }: {
  endpoint: string; version: number; proposal?: boolean; disabled?: boolean; reminder?: boolean;
}) {
  const [preview, setPreview] = useState<Share | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function prepare(mode: 'preview' | 'copy' | 'open' | 'link', renew = false) {
    if (busy || disabled) return;
    if (renew && !window.confirm('Gerar um novo link para esta versão publicada? Os links de arte anteriores deixarão de funcionar.')) return;
    // Open synchronously to avoid popup blockers; never navigate until validation succeeds.
    const tab = mode === 'open' ? window.open('about:blank', '_blank') : null;
    if (tab) tab.opener = null;
    setBusy(true); setError(''); setNotice(''); setPreview(null);
    try {
      const result: Share = await fetchWithAuth(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal ? { action: 'prepare_share', version } : { renew }),
      });
      setPreview(result);
      if (result.expired) { tab?.close(); return; }
      if (!result.link || !result.message || !result.expires_at || !Number.isFinite(Date.parse(result.expires_at)) || Date.parse(result.expires_at) <= Date.now()) throw new Error('O link não está válido. Prepare novamente a mensagem.');
      if (mode === 'open') {
        if (!result.whatsapp_number || !/^\d{10,15}$/.test(result.whatsapp_number)) throw new Error('Confirme o número de WhatsApp no briefing.');
        if (!tab) throw new Error('O navegador bloqueou a janela. Use “Copiar mensagem” e cole na conversa.');
        tab.location.href = `https://wa.me/${result.whatsapp_number}?text=${encodeURIComponent(result.message)}`;
      } else if (mode === 'copy' || mode === 'link') {
        await navigator.clipboard.writeText(mode === 'link' ? result.link : result.message);
        setNotice(mode === 'link' ? 'Link atual validado e copiado.' : 'Mensagem atual validada e copiada.');
      }
    } catch (reason) {
      tab?.close(); setPreview(null);
      setError(reason instanceof Error ? reason.message : 'Não foi possível validar o link. Tente novamente.');
    } finally { setBusy(false); }
  }

  return <div className="space-y-3">
    <p className="text-xs leading-5 text-slate-500">O link e a versão são verificados ao copiar ou abrir. WhatsApp não envia nem anexa ficheiros automaticamente.</p>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="text-xs text-brand-800">{notice}</p> : null}
    {preview?.expired ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-900">{preview.detail}</p><button type="button" disabled={busy || disabled} onClick={() => prepare('preview', true)} className="mt-3 rounded-lg border bg-white px-3 py-2 text-xs font-semibold">Gerar novo link e preparar mensagem</button></div> : null}
    {preview?.message && !preview.expired ? <><label className="block text-xs font-semibold">{reminder ? 'Mensagem para acompanhar a decisão' : 'Mensagem de WhatsApp'}<textarea readOnly rows={9} value={preview.message} className="mt-2 w-full rounded-lg border bg-white p-3 text-xs leading-5" /></label><p className="text-[11px] text-slate-500">Link válido até {new Date(preview.expires_at!).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo' })} · Maputo</p></> : null}
    <div className="flex flex-wrap gap-3 text-xs font-semibold">
      <button type="button" disabled={busy || disabled} onClick={() => prepare('preview')} className="rounded-lg border px-3 py-2 disabled:opacity-40">{busy ? 'A validar…' : 'Validar e preparar mensagem'}</button>
      <button type="button" disabled={busy || disabled} onClick={() => prepare('copy')} className="underline disabled:opacity-40">{reminder ? 'Copiar lembrete' : 'Copiar mensagem'}</button>
      <button type="button" disabled={busy || disabled} onClick={() => prepare('open')} className="underline disabled:opacity-40">Abrir WhatsApp</button>
      <button type="button" disabled={busy || disabled} onClick={() => prepare('link')} className="underline disabled:opacity-40">Copiar link privado</button>
    </div>
  </div>;
}
