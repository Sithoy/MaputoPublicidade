'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { type ReceptionRequest, updateReception } from '@/lib/reception-api';

export function ReceptionRequestPanel({ request, userId, canReleaseOthers = false, onChange, onClose }: {
  request: ReceptionRequest; userId: number; canReleaseOthers?: boolean; onChange: (request: ReceptionRequest | null) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ client_name: request.client_name, client_email: request.client_email,
    client_phone: request.client_phone, client_nuit: request.client_nuit, reception_notes: request.reception_notes });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const owns = request.reception_owner === userId;
  const dirty = Object.entries(form).some(([key, value]) => value !== request[key as keyof ReceptionRequest]);

  async function perform(action: 'claim' | 'handoff' | 'edit' | 'release') {
    setBusy(true); setError(''); setSaved('');
    try {
      const updated = await updateReception(request.reference, action, action === 'edit' ? form : {});
      onChange(action === 'handoff' ? null : updated);
      if (action === 'edit') setSaved('Dados de triagem guardados.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar.'); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent) { event.preventDefault(); void perform('edit'); }

  return <section aria-label={`Triagem ${request.reference}`} className="rounded-2xl border border-brand-200 bg-white p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Triagem do pedido</p><h2 className="mt-1 text-xl font-semibold">{request.reference}</h2></div>
      <button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm('Sair sem guardar as alterações?')) onClose(); }} className="rounded-lg border px-3 py-2 text-sm">Fechar</button></div>
    <p className="mt-3 text-sm text-slate-600">{request.owner_name ? `Responsável: ${request.owner_name}` : 'Ainda sem responsável'}</p>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {saved && <p role="status" className="mt-3 text-sm text-brand-700">{saved}</p>}
    {!request.reception_owner && <button type="button" disabled={busy} onClick={() => perform('claim')} className="mt-4 rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Assumir atendimento</button>}
    {request.reception_owner && !owns && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Este atendimento está a ser tratado por outra pessoa.</p>}
    {request.reception_owner && (owns || canReleaseOthers) && <button type="button" disabled={busy || dirty} onClick={() => { if (window.confirm('Devolver este atendimento à fila para outra pessoa assumir?')) void perform('release'); }} className="mt-3 text-sm text-slate-600 underline">Devolver à fila</button>}
    <div className="my-5 rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold">O que o cliente precisa</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{request.notes || 'Consulte os materiais e o pedido completo.'}</p>
      <ul className="mt-3 space-y-2 text-sm">{request.items.map((item, index) => <li key={index}>{item.quantity} × {item.description}</li>)}</ul>
      <p className="mt-3 text-xs text-slate-500">Prazo pretendido: {request.deadline || 'A confirmar com o cliente'} — não é uma promessa de entrega.</p>
      <Link href={`/admin/orcamentos/${encodeURIComponent(request.reference)}`} className="mt-3 inline-block text-sm font-semibold text-brand-700">Abrir pedido completo e anexos →</Link></div>
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">{([
        ['client_name', 'Cliente / empresa', 'text'], ['client_nuit', 'NUIT', 'text'],
        ['client_email', 'E-mail', 'email'], ['client_phone', 'Telefone', 'tel'],
      ] as const).map(([key, label, type]) => <label key={key} className="text-sm font-medium">{label}<input type={type} required={key === 'client_name'} maxLength={key === 'client_name' ? 255 : key === 'client_email' ? 254 : 50} disabled={!owns || busy} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border p-3 disabled:bg-slate-50" /></label>)}</div>
      <label className="block text-sm font-medium">Notas internas para o Comercial<textarea rows={4} maxLength={10000} disabled={!owns || busy} value={form.reception_notes} onChange={(event) => setForm((current) => ({ ...current, reception_notes: event.target.value }))} className="mt-2 w-full rounded-xl border p-3 disabled:bg-slate-50" placeholder="Contexto, dúvidas por confirmar, preferências e próximos passos…" /></label>
      {request.missing_information.length > 0 && <p className="text-sm text-amber-800">Por completar: {request.missing_information.join(', ')}</p>}
      {owns && <div className="flex flex-wrap gap-3"><button disabled={busy || !dirty} className="rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50">Guardar triagem</button><button type="button" disabled={busy || dirty || request.missing_information.length > 0} onClick={() => perform('handoff')} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Encaminhar ao Comercial</button></div>}
      {owns && dirty && <p className="text-xs text-slate-500">Guarde as alterações antes de encaminhar.</p>}
    </form>
  </section>;
}
