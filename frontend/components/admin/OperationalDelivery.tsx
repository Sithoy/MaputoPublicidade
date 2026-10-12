'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getOrder, updateOrderDelivery } from '@/lib/admin-api';
import type { Order } from '@/lib/api';
import { orderStatusLabels } from '@/lib/status';

export function OperationalDelivery({ reference, onSaved }: { reference: string; onSaved?: () => void }) {
  const { can } = useAdminAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [installation, setInstallation] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = can('orders.view');
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    getOrder(reference).then((value) => { if (active) { setOrder(value); setMethod(value.delivery_method || 'pickup'); setAddress(value.delivery_address || ''); setInstallation(Boolean(value.installation_required)); } }).catch(() => { if (active) setError('Não foi possível consultar a entrega.'); });
    return () => { active = false; };
  }, [reference, allowed]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { setOrder(await updateOrderDelivery(reference, { delivery_method: method, delivery_address: address, installation_required: installation })); setNotice('Entrega atualizada no mesmo trabalho.'); onSaved?.(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar.'); } finally { setBusy(false); }
  }
  if (!allowed) return <p>A sua função não permite consultar a entrega.</p>;
  return <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Produção e entrega · {reference}</h2>{error ? <p role="alert">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}{order ? <><p>Estado: {orderStatusLabels[order.status] || order.status}</p><p>Data agendada: {order.scheduled_date ? new Date(order.scheduled_date).toLocaleString('pt-MZ') : 'Por confirmar'}</p><form onSubmit={save}><fieldset disabled={busy || !can('orders.manage_delivery')} className="space-y-4"><label className="block text-sm">Receção do trabalho<select value={method} onChange={(event) => setMethod(event.target.value as 'pickup' | 'delivery')} className="ml-3 rounded-lg border p-2"><option value="pickup">Levantamento</option><option value="delivery">Entrega</option></select></label>{method === 'delivery' || installation ? <label className="block text-sm">Local de entrega / instalação<textarea required value={address} onChange={(event) => setAddress(event.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label> : null}<label className="flex gap-2 text-sm"><input type="checkbox" checked={installation} onChange={(event) => setInstallation(event.target.checked)} />Precisa de instalação</label>{can('orders.manage_delivery') ? <button className="rounded-xl border px-4 py-2">Guardar entrega</button> : null}</fieldset></form></> : <p>A carregar o trabalho…</p>}</section>;
}
