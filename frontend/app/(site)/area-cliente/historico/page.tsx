'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  History,
  ReceiptText,
  RefreshCw,
  Search,
  WalletCards,
} from 'lucide-react';
import { getClientOrders } from '@/lib/client-api';
import type { Order } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { cn, formatMZN } from '@/lib/utils';
import { getOrderHistoryDate, getOrderLabel } from '@/lib/order-display';

type HistoryFilter = 'completed' | 'cancelled' | 'all';

function yearFor(order: Order): string {
  return String(new Date(getOrderHistoryDate(order)).getFullYear());
}

export default function ClientJobHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HistoryFilter>('completed');
  const [yearFilter, setYearFilter] = useState('all');

  useEffect(() => {
    getClientOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false));
  }, []);

  const historicalOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status === 'delivered' || order.status === 'cancelled')
        .sort(
          (a, b) =>
            new Date(getOrderHistoryDate(b)).getTime() - new Date(getOrderHistoryDate(a)).getTime()
        ),
    [orders]
  );

  const years = useMemo(
    () => Array.from(new Set(historicalOrders.map(yearFor))).sort((a, b) => Number(b) - Number(a)),
    [historicalOrders]
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return historicalOrders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && order.status === 'delivered') ||
        (statusFilter === 'cancelled' && order.status === 'cancelled');
      const matchesYear = yearFilter === 'all' || yearFor(order) === yearFilter;
      const matchesSearch =
        !term ||
        order.reference.toLowerCase().includes(term) ||
        getOrderLabel(order).toLowerCase().includes(term);
      return matchesStatus && matchesYear && matchesSearch;
    });
  }, [historicalOrders, search, statusFilter, yearFilter]);

  const deliveredOrders = historicalOrders.filter((order) => order.status === 'delivered');
  const totalDeliveredValue = deliveredOrders.reduce(
    (total, order) => total + (order.final_price || order.amount_paid || 0),
    0
  );
  const latestDelivery = deliveredOrders[0] ? getOrderHistoryDate(deliveredOrders[0]) : null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-5" aria-label="A carregar histórico de trabalhos">
        <div className="h-24 rounded-3xl bg-[#e2e9e3]" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
          <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
          <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
        </div>
        <div className="h-80 rounded-3xl bg-[#e2e9e3]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Memória da sua marca</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-[-0.03em] text-dark">Histórico de trabalhos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">
            Consulte entregas anteriores, recupere documentos e repita materiais que a sua equipa já aprovou.
          </p>
        </div>
        <Link href="/area-cliente/novo-pedido" className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-600">
          <RefreshCw className="h-4 w-4" />
          Repetir um trabalho
        </Link>
      </section>

      {error ? <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo do histórico">
        {[
          { icon: CheckCircle2, label: 'Trabalhos entregues', value: String(deliveredOrders.length), note: 'guardados no histórico', tone: 'bg-brand-50 text-brand-700' },
          { icon: WalletCards, label: 'Valor realizado', value: totalDeliveredValue ? formatMZN(totalDeliveredValue) : '—', note: 'total dos trabalhos entregues', tone: 'bg-sky-50 text-sky-700' },
          { icon: CalendarDays, label: 'Última entrega', value: latestDelivery ? new Date(latestDelivery).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', note: 'entrega mais recente', tone: 'bg-amber-50 text-amber-700' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-[#dfe7e1] bg-white p-5 shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[#6a7971]">{stat.label}</p><p className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">{stat.value}</p><p className="mt-1 text-xs text-[#829087]">{stat.note}</p></div><span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', stat.tone)}><Icon className="h-5 w-5" /></span></div>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-[#dfe7e1] bg-white p-4 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#edf1ee] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9890]" />
            <Input className="pl-10" placeholder="Pesquisar por referência ou trabalho..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="h-10 rounded-xl border border-[#d7e2da] bg-white px-3 text-sm font-semibold text-[#52635b] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50" aria-label="Filtrar histórico por ano">
              <option value="all">Todos os anos</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <div className="flex rounded-xl bg-[#f3f6f3] p-1" aria-label="Filtrar histórico por estado">
              {[
                ['completed', 'Entregues'],
                ['cancelled', 'Cancelados'],
                ['all', 'Todos'],
              ].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setStatusFilter(value as HistoryFilter)} className={cn('rounded-lg px-3 py-2 text-xs font-semibold transition', statusFilter === value ? 'bg-white text-brand-800 shadow-sm' : 'text-[#718078] hover:text-dark')}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><History className="h-6 w-6" /></span>
            <h2 className="mt-4 text-lg font-semibold text-dark">Ainda não há trabalhos neste histórico</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#718078]">Quando um trabalho for entregue, ficará disponível aqui com os seus documentos e detalhes.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#edf1ee]">
            {filteredOrders.map((order) => {
              const completedAt = getOrderHistoryDate(order);
              return (
                <article key={order.id} className="py-5 first:pt-5 last:pb-0">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-brand-700">{order.reference}</span>
                        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', order.status === 'delivered' ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-[#f3f4f3] text-[#68776f] ring-[#dfe3df]')}>{order.status === 'delivered' ? 'Entregue' : 'Cancelado'}</span>
                      </div>
                      <h2 className="mt-2 truncate text-base font-semibold text-dark">{getOrderLabel(order)}</h2>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#718078]">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{order.status === 'delivered' ? 'Entregue' : 'Atualizado'} em {new Date(completedAt).toLocaleDateString('pt-MZ')}</span>
                        <span>{order.item_count ?? order.items?.length ?? 0} item(s)</span>
                        {order.final_price ? <span className="font-semibold text-[#405047]">{formatMZN(order.final_price)}</span> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.quote_reference ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7f5] px-2.5 py-1.5 text-[11px] font-medium text-[#617068]"><FileText className="h-3.5 w-3.5" />Proposta {order.quote_reference}</span> : null}
                        {order.invoice_reference ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7f5] px-2.5 py-1.5 text-[11px] font-medium text-[#617068]"><ReceiptText className="h-3.5 w-3.5" />Fatura {order.invoice_reference}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-3">
                      <Link href={`/area-cliente/novo-pedido?repetir=${encodeURIComponent(order.reference)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7e2da] bg-white px-3 text-xs font-semibold text-brand-800 transition hover:bg-brand-50"><RefreshCw className="h-3.5 w-3.5" />Repetir trabalho</Link>
                      <Link href={`/area-cliente/encomendas/${order.reference}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-800 px-3 text-xs font-semibold text-white transition hover:bg-brand-700">Ver detalhes<ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
