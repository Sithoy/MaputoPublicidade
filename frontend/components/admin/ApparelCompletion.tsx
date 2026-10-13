'use client';

import { useState } from 'react';
import { ApparelMatrix } from '@/components/ApparelMatrix';
import type { ApparelDistribution } from '@/lib/apparel';
import { fetchWithAuth } from '@/lib/auth';

export function ApparelCompletion({ reference, itemId, quantity, initial }: { reference: string; itemId: number; quantity: number; initial: ApparelDistribution }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    setBusy(true); setMessage('');
    try {
      const result = await fetchWithAuth(`/api/quotes/${reference}/apparel-distribution/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: itemId, apparel: value }) });
      setValue(result.material_briefing.apparel); setMessage(result.detail + ' Atualize a consulta para ver o mapa no documento.'); setOpen(false);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível guardar a distribuição.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-3"><button type="button" disabled={busy} onClick={() => setOpen(!open)} className="text-xs font-semibold text-brand-800 underline">{open ? 'Fechar distribuição' : 'Confirmar / ajustar distribuição'}</button>{message && <p role="status" className="mt-2 text-xs">{message}</p>}{open && <fieldset disabled={busy} className="mt-3"><ApparelMatrix id={`complete-${itemId}`} quantity={quantity} value={value} onChange={setValue} /><button type="button" onClick={() => void save()} className="mt-3 rounded-lg bg-brand-800 px-4 py-2 text-xs text-white">Guardar distribuição sem alterar preços</button></fieldset>}</div>;
}
