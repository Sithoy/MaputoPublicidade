'use client';

import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getOrders, updateOrderStatus } from '@/lib/admin-api';
import type { Order } from '@/lib/api';
import { orderStatusLabels } from '@/lib/status';
import { OperationalDelivery } from './OperationalDelivery';

export function DeliveryWorkspace({ initialReference = '' }: { initialReference?: string }) {
  const { loading, can } = useAdminAuth();
  const allowed = can('orders.view');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState(initialReference);
  const [filter, setFilter] = useState('ready');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    setPending(true); setError('');
    getOrders().then((rows) => { if (active) setOrders(rows); })
      .catch(() => { if (active) setError('Não foi possível consultar as entregas.'); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [loading, allowed, revision]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const current = orders.find((order) => order.reference === selected);
  const visible = orders.filter((order) => (filter === 'ready' ? order.status === 'ready' : filter === 'completed' ? order.status === 'delivered' : ['approved', 'in_production', 'ready'].includes(order.status)) &&
    `${order.reference} ${order.client_name || ''} ${order.job_summary || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  async function complete() {
    if (!current || current.status !== 'ready' || dirty || busy || !can('orders.manage_status')) return;
    if (!window.confirm('Confirmar que a entrega, levantamento ou instalação foi concluída? O registo ficará associado ao seu utilizador.')) return;
    setBusy(true); setError('');
    try { await updateOrderStatus(current.reference, 'delivered'); setRevision((value) => value + 1); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a entrega.'); }
    finally { setBusy(false); }
  }
  if (loading) return <p>A abrir Entregas…</p>;
  if (!allowed) return <p role="alert">A sua função não permite consultar entregas.</p>;
  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="desk-hero"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Operações · Entregas</p><h1 className="mt-2 font-semibold">Do trabalho pronto à entrega confirmada.</h1><p className="mt-2 text-sm text-slate-500">Agende a entrega, o levantamento ou a instalação no mesmo registo. A produção e a aprovação da arte não são alteradas aqui.</p></header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={() => setRevision((value) => value + 1)} className="ml-3 underline">Tentar novamente</button></p> : null}
    {pending ? <p role="status">A carregar entregas…</p> : selected ? current ? <>
      <button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm('Sair sem guardar as alterações à entrega?')) { setSelected(''); setDirty(false); } }} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">← Voltar às entregas</button>
      <div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">{current.client_name || 'Cliente'} · {current.reference}</h2><p className="mt-2 text-sm text-slate-500">{current.job_summary || current.items?.[0]?.description || 'Encomenda'} · {orderStatusLabels[current.status]}</p></div>
      <div onChangeCapture={() => setDirty(true)}><OperationalDelivery key={current.reference} reference={current.reference} onSaved={() => { setDirty(false); setRevision((value) => value + 1); }} /></div>
      {current.status === 'ready' && can('orders.manage_status') ? <button type="button" disabled={busy || dirty} onClick={complete} className="desk-primary rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Confirmar entrega concluída</button> : !['ready', 'delivered', 'cancelled'].includes(current.status) ? <p className="rounded-xl bg-amber-50 p-4 text-sm">Pode preparar a logística. Só é possível concluir depois de a Produção marcar o trabalho como pronto.</p> : null}
    </> : <p role="alert">Esta encomenda não está disponível. <button type="button" onClick={() => setSelected('')} className="underline">Voltar à lista</button></p> : <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex flex-wrap items-end gap-4 border-b p-5"><label className="flex-1 text-xs font-semibold">Pesquisar encomendas<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cliente, trabalho ou referência" className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-semibold">Mostrar<select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="ml-3 rounded-xl border p-3 text-sm"><option value="ready">Prontos para entregar</option><option value="planning">Preparar logística</option><option value="completed">Entregas concluídas</option></select></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-brand-50 text-xs text-slate-500"><tr><th scope="col" className="p-4">Encomenda / cliente</th><th scope="col" className="p-4">Estado</th><th scope="col" className="p-4">Agendamento</th><th scope="col" className="p-4">Ação</th></tr></thead><tbody className="divide-y">{visible.slice((page - 1) * 10, page * 10).map((order) => <tr key={order.reference}><td className="p-4"><p className="font-semibold">{order.client_name || 'Cliente'}</p><p className="mt-1 text-xs text-slate-500">{order.reference} · {order.job_summary || order.items?.[0]?.description || 'Encomenda'}</p></td><td className="p-4 text-xs">{orderStatusLabels[order.status]}</td><td className="p-4 text-xs">{order.scheduled_date ? new Date(order.scheduled_date).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo' }) : 'Por agendar'}</td><td className="p-4"><button type="button" onClick={() => setSelected(order.reference)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-brand-800"><Truck aria-hidden="true" className="h-4 w-4" />Abrir entrega<span className="sr-only"> {order.reference}</span></button></td></tr>)}</tbody></table></div>
      {!visible.length ? <p className="p-8 text-center text-sm text-slate-500">Sem encomendas nesta fila.</p> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs"><span>{visible.length} {visible.length === 1 ? 'encomenda' : 'encomendas'} · 10 por página</span><nav aria-label="Paginação de entregas" className="flex items-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page}</span><button type="button" disabled={page * 10 >= visible.length} onClick={() => setPage((value) => value + 1)}>Seguinte</button></nav></footer>
    </section>}
  </div>;
}
