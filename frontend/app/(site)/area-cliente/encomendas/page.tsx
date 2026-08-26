'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Search } from 'lucide-react';
import { getClientOrders } from '@/lib/client-api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import type { Order } from '@/lib/api';
import { getClientNextAction, getOrderProgress } from '@/lib/workflow';
import { clientOrderStatusLabels } from '@/lib/status';
import { formatMZN } from '@/lib/utils';

function orderLabel(order: Order) {
  const items = order.items ?? [];
  if (items.length === 1) return items[0].description;
  if (items.length > 1) return `${items[0].description} +${items.length - 1}`;
  if (order.item_count === 1) return '1 item solicitado';
  if (order.item_count && order.item_count > 1) return `${order.item_count} itens solicitados`;
  return 'Pedido de produção';
}

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active'>('active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getClientOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let data = [...orders];
    if (filter === 'active') {
      data = data.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (o) =>
          o.reference.toLowerCase().includes(term) ||
          orderLabel(o).toLowerCase().includes(term)
      );
    }
    return data;
  }, [orders, filter, search]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">O seu histórico</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-dark">Pedidos</h1>
          <p className="mt-1 text-sm text-[#718078]">
            Acompanhe decisões, produção, pagamentos e entregas num só lugar.
          </p>
        </div>
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Iniciar novo pedido
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card className="rounded-2xl border-[#dfe7e1] shadow-none">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9890]" />
            <Input
              className="pl-10"
              placeholder="Pesquisar por referência ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'active' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Em curso
            </Button>
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-[#dfe7e1]">
          <CardContent className="py-12 text-center text-[#718078]">
            Nenhum pedido corresponde aos filtros seleccionados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const nextAction = getClientNextAction(order);
            return (
              <Link key={order.id} href={`/area-cliente/encomendas/${order.reference}`} className="block">
                <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)] transition hover:-translate-y-0.5 hover:border-brand-200">
                  <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-brand-700">
                          {order.reference}
                        </span>
                        <Badge variant="outline">{clientOrderStatusLabels[order.status] || order.status}</Badge>
                        {nextAction.actionRequired ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                            Acção necessária
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 truncate font-semibold text-dark">{orderLabel(order)}</p>
                      <p className="mt-1 text-xs text-[#7b8981]">
                        {order.item_count ?? order.items?.length ?? 0} item(s) ·{' '}
                        {new Date(order.created_at).toLocaleDateString('pt-MZ')}
                      </p>
                      <div className="mt-4 flex max-w-lg items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7ece8]" aria-hidden="true">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${getOrderProgress(order.status)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-[#718078]">
                          {getOrderProgress(order.status)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-5 lg:min-w-[310px] lg:justify-end">
                      <div className="lg:text-right">
                        <p className="text-sm font-semibold text-dark">{nextAction.label}</p>
                        <p className="mt-1 text-xs text-[#718078]">
                          {order.amount_due
                            ? `${formatMZN(order.amount_due)} por regularizar`
                            : 'Sem saldo pendente'}
                        </p>
                      </div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
