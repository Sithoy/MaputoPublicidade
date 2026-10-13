'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/auth';

type Signature = { user_id: number; email: string; display_name: string; title: string; approved: boolean; approved_by: string | null };

export function StaffSignatures({ onDirtyChange, onBusyChange }: { onDirtyChange?: (value: boolean) => void; onBusyChange?: (value: boolean) => void }) {
  const [rows, setRows] = useState<Signature[]>([]);
  const [selected, setSelected] = useState<Signature | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { onDirtyChange?.(Boolean(selected)); }, [selected, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { if (!selected) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [selected]);
  useEffect(() => { let alive = true; fetchWithAuth('/api/staff-email-signatures/').then((data) => { if (!Array.isArray(data)) throw new Error(); if (alive) setRows(data); }).catch(() => { if (alive) setError('Não foi possível carregar as assinaturas.'); }); return () => { alive = false; }; }, []);
  async function save() {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await fetchWithAuth('/api/staff-email-signatures/', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: selected.user_id, display_name: selected.display_name, title: selected.title, approved: selected.approved }) });
      setRows(data); setSelected(null); setNotice('Assinatura e autorização de envio atualizadas.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Assinaturas de email" className="mt-6 space-y-4 rounded-2xl border p-5">
    <h3 className="font-semibold text-brand-900">Assinaturas e responsabilidade</h3>
    <p className="text-sm leading-6 text-slate-500">Apenas colaboradores com acesso ao Atendimento e assinatura aprovada podem enviar emails. O nome e a função são aplicados pelo sistema; o remetente continua a ser atendimento@maputopublicidade.com.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-brand-800">{notice}</p>}
    <div className="space-y-2">{rows.map((row) => <button key={row.user_id} disabled={busy} type="button" onClick={() => { if (selected && !window.confirm('Descartar a edição da assinatura atual?')) return; setSelected({ ...row }); }} className="flex w-full flex-wrap justify-between gap-2 rounded-xl border p-3 text-left text-sm"><span>{row.display_name || row.email}<span className="ml-2 text-xs text-slate-500">{row.title}</span></span><span className={row.approved ? 'text-brand-700' : 'text-amber-700'}>{row.approved ? 'Aprovada' : 'Envio não autorizado'}</span></button>)}</div>
    {selected && <fieldset disabled={busy} className="space-y-3 rounded-xl bg-[#f5f6ef] p-4"><p className="text-xs text-slate-500">Conta: {selected.email}</p><label className="block text-sm">Nome na assinatura<input maxLength={160} value={selected.display_name} onChange={(event) => setSelected({ ...selected, display_name: event.target.value })} className="mt-2 w-full rounded-lg border p-3" /></label><label className="block text-sm">Função na assinatura<input maxLength={120} value={selected.title} onChange={(event) => setSelected({ ...selected, title: event.target.value })} className="mt-2 w-full rounded-lg border p-3" /></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={selected.approved} onChange={(event) => setSelected({ ...selected, approved: event.target.checked })} />Aprovo esta assinatura e autorizo o envio por este colaborador.</label><div className="rounded-lg border-l-4 border-[#b69a52] bg-white p-4 text-sm"><strong>{selected.display_name || 'Nome do colaborador'}</strong><p>{selected.title || 'Função'}</p><p className="mt-2 text-slate-500">Maputo Publicidade · atendimento@maputopublicidade.com</p></div><button disabled={!selected.display_name.trim() || !selected.title.trim()} type="button" onClick={() => void save()} className="rounded-lg bg-brand-800 px-4 py-3 text-sm text-white">{busy ? 'A guardar…' : 'Guardar assinatura e autorização'}</button><button type="button" onClick={() => setSelected(null)} className="ml-3 text-sm">Cancelar</button></fieldset>}
  </section>;
}
