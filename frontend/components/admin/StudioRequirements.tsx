'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/auth';
import type { Job } from './ProductionWorkspace';

export function StudioRequirements({ job, disabled, onSaved, onDirty, onBusy }: {
  job: Job; disabled: boolean; onSaved: (job: Job) => void; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void;
}) {
  const [routes, setRoutes] = useState(() => Object.fromEntries(job.items.map((item) => [item.id, job.artwork_routes?.find((row) => row.item_id === item.id)?.requirement || (item.needs_design ? 'studio' : 'none')])));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (disabled) return;
    onBusy(true); setError('');
    try {
      const next = await fetchWithAuth(`/api/production/${job.reference}/requirements/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note, items: job.items.map((item) => ({ item_id: item.id, requirement: routes[item.id] })) }) });
      onDirty(false); onSaved(next); setNote('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar os requisitos.'); }
    finally { onBusy(false); }
  }
  return <form onSubmit={save} className="space-y-4 rounded-2xl border bg-[#f7f8f2] p-5"><h3 className="font-semibold text-brand-900">Preparar o trabalho no Studio</h3><p className="text-xs leading-5 text-slate-500">Confirme a origem da arte por artigo. A versão submetida deve cobrir todos os artigos que precisam de arte. Nenhum artigo segue isoladamente para produção.</p><fieldset disabled={disabled} className="space-y-4">{job.items.map((item) => <label key={item.id} className="block text-sm font-medium">{item.quantity} × {item.description}<select aria-label={`Arte de ${item.description}`} value={routes[item.id]} onChange={(event) => { setRoutes((previous) => ({ ...previous, [item.id]: event.target.value })); onDirty(true); }} className="mt-2 block w-full rounded-xl border bg-white p-3"><option value="none">Sem arte / aprovação não necessária</option><option value="client">Arte fornecida pelo cliente — verificar e submeter</option><option value="studio">Studio cria ou adapta a arte</option></select></label>)}<label className="block text-sm">Verificação técnica / motivo da alteração<textarea required maxLength={1000} value={note} onChange={(event) => { setNote(event.target.value); onDirty(true); }} rows={2} placeholder="Confirme ficheiros, medidas e referências; justifique se não necessita de aprovação." className="mt-2 w-full rounded-xl border p-3" /></label><button className="desk-primary rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Confirmar requisitos de arte</button></fieldset>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}</form>;
}
