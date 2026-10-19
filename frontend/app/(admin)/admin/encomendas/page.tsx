'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Edit,
  Factory,
  FileDown,
  Search,
  Truck,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ProductionBoundary } from '@/components/admin/ProductionBoundary';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { exportOrders, getOrders } from '@/lib/admin-api';
import type { Order } from '@/lib/api';
import { orderStatusLabels, orderStatusOptions } from '@/lib/status';
import { cn, formatMZN } from '@/lib/utils';

type OperationsView = 'production' | 'delivery' | 'completed' | 'all';

const operationsViews: Array<{
  value: OperationsView;
  label: string;
  description: string;
}> = [
  {
    value: 'production',
    label: 'Produção',
    description: 'Aprovados e em execução',
  },
  {
    value: 'delivery',
    label: 'Entregas',
    description: 'Agendados e prontos',
  },
  {
    value: 'completed',
    label: 'Concluídos',
    description: 'Entregues ao cliente',
  },
  {
    value: 'all',
    label: 'Todos',
    description: 'Visão integral',
  },
];

function orderLabel(order: Order) {
  if (order.job_summary) return order.job_summary;
  const items = order.items ?? [];
  if (items.length === 0) return 'Encomenda';
  if (items.length === 1) return items[0].description;
  return `${items[0].description} +${items.length - 1}`;
}

function clientLabel(order: Order) {
  return order.client_name || order.user_email || 'Cliente não identificado';
}

function viewFromStatus(status: string): OperationsView {
  if (status === 'delivered') return 'completed';
  if (status === 'ready') return 'delivery';
  return 'production';
}

function isSameLocalDay(value: string | null | undefined, date: Date) {
  if (!value) return false;
  const candidate = new Date(value);
  return (
    candidate.getFullYear() === date.getFullYear() &&
    candidate.getMonth() === date.getMonth() &&
    candidate.getDate() === date.getDate()
  );
}

function AdminOrdersContent() {
  const { loading: authLoading, can } = useAdminAuth();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') ?? '';
  const requestedView = searchParams.get('view');
  const canViewPayments = can('payments.view');
  const initialView = operationsViews.some((view) => view.value === requestedView)
    ? (requestedView as OperationsView)
    : viewFromStatus(urlStatus);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeView, setActiveView] = useState<OperationsView>(initialView);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const safeStatus = urlStatus && orderStatusLabels[urlStatus] ? urlStatus : '';
    setStatusFilter(safeStatus);
    if (safeStatus) setActiveView(viewFromStatus(safeStatus));
  }, [urlStatus]);

  const metrics = useMemo(() => {
    const today = new Date();
    return {
      approved: orders.filter((order) => order.status === 'approved').length,
      production: orders.filter((order) => order.status === 'in_production').length,
      unscheduled: orders.filter(
        (order) => order.status === 'ready' && !order.scheduled_date
      ).length,
      today: orders.filter(
        (order) =>
          !['delivered', 'cancelled'].includes(order.status) &&
          isSameLocalDay(order.scheduled_date, today)
      ).length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    let data = [...orders];

    if (activeView === 'production') {
      data = data.filter((order) =>
        ['approved', 'in_production'].includes(order.status)
      );
    } else if (activeView === 'delivery') {
      data = data.filter(
        (order) =>
          order.status !== 'delivered' &&
          order.status !== 'cancelled' &&
          (order.status === 'ready' || Boolean(order.scheduled_date))
      );
    } else if (activeView === 'completed') {
      data = data.filter((order) => order.status === 'delivered');
    }

    if (statusFilter) data = data.filter((order) => order.status === statusFilter);

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      data = data.filter((order) =>
        [
          order.reference,
          orderLabel(order),
          clientLabel(order),
          order.user_email,
          order.delivery_responsible_name,
        ].some((value) => value?.toLowerCase().includes(term))
      );
    }

    return data;
  }, [activeView, orders, search, statusFilter]);

  async function loadOrders() {
    try {
      setError('');
      setOrders(await getOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar encomendas');
    }
  }

  useEffect(() => {
    if (authLoading) return;
    void loadOrders();
  }, [authLoading]);

  function selectView(view: OperationsView) {
    setActiveView(view);
    setStatusFilter('');
  }

  const columns: Column<Order>[] = [
    {
      key: 'reference',
      header: 'Trabalho',
      render: (item) => (
        <div>
          <p className="font-semibold text-dark">{item.reference}</p>
          <p className="mt-0.5 max-w-[260px] truncate text-xs text-gray-500">
            {orderLabel(item)}
          </p>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Cliente',
      render: (item) => (
        <div>
          <p className="font-medium text-gray-800">{clientLabel(item)}</p>
          {item.client_name && item.user_email ? (
            <p className="mt-0.5 text-xs text-gray-400">{item.user_email}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (item) => (
        <StatusBadge
          status={item.status}
          label={orderStatusLabels[item.status] || item.status}
        />
      ),
    },
    {
      key: 'delivery',
      header: 'Entrega',
      render: (item) => (
        <div className="min-w-[150px]">
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            {item.delivery_method === 'delivery' ? (
              <Truck className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
            )}
            {item.delivery_method_display || 'Por definir'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {item.scheduled_date
              ? new Date(item.scheduled_date).toLocaleString('pt-MZ', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : 'Sem agendamento'}
          </p>
        </div>
      ),
    },
    {
      key: 'responsible',
      header: 'Responsável',
      render: (item) => item.delivery_responsible_name || 'Por atribuir',
    },
    ...(canViewPayments
      ? [
          {
            key: 'finance',
            header: 'Financeiro',
            render: (item: Order) => (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {item.payment_status_display || item.payment_status}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {item.amount_due !== undefined ? formatMZN(item.amount_due) : 'Sem saldo'}
                </p>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Centro de operações
          </p>
          <h1 className="text-2xl font-bold text-dark">Produção e entregas</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Acompanhe os trabalhos aprovados, prepare as entregas e mantenha a equipa
            alinhada até à conclusão.
          </p>
        </div>
        {can('orders.export') ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportOrders('csv', statusFilter ? { status: statusFilter } : {})}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportOrders('xlsx', statusFilter ? { status: statusFilter } : {})}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Excel
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'A iniciar',
            value: metrics.approved,
            detail: 'Trabalhos aprovados',
            icon: CheckCircle2,
            tone: 'bg-blue-50 text-blue-700',
          },
          {
            label: 'Em produção',
            value: metrics.production,
            detail: 'Em execução agora',
            icon: Factory,
            tone: 'bg-amber-50 text-amber-700',
          },
          {
            label: 'Sem agendamento',
            value: metrics.unscheduled,
            detail: 'Prontos por agendar',
            icon: CircleAlert,
            tone: 'bg-red-50 text-red-700',
          },
          {
            label: 'Entregas hoje',
            value: metrics.today,
            detail: 'Agenda do dia',
            icon: Truck,
            tone: 'bg-emerald-50 text-emerald-700',
          },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                <p className="mt-1 text-3xl font-bold text-dark">{metric.value}</p>
                <p className="mt-1 text-xs text-gray-400">{metric.detail}</p>
              </div>
              <span className={cn('rounded-2xl p-3', metric.tone)}>
                <metric.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div
            className="grid gap-2 border-b border-gray-100 pb-4 sm:grid-cols-4"
            role="tablist"
            aria-label="Filas operacionais"
          >
            {operationsViews.map((view) => (
              <button
                key={view.value}
                type="button"
                role="tab"
                aria-selected={activeView === view.value}
                onClick={() => selectView(view.value)}
                className={cn(
                  'rounded-xl px-4 py-3 text-left transition-colors',
                  activeView === view.value
                    ? 'bg-dark text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                )}
              >
                <span className="block text-sm font-semibold">{view.label}</span>
                <span
                  className={cn(
                    'mt-0.5 block text-xs',
                    activeView === view.value ? 'text-white/65' : 'text-gray-400'
                  )}
                >
                  {view.description}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                aria-label="Pesquisar trabalhos"
                placeholder="Pesquisar referência, trabalho, cliente ou responsável..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {orderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        emptyText="Não existem trabalhos nesta fila."
        actions={(item) => (
          <Link href={`/admin/encomendas/${item.reference}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Abrir
            </Button>
          </Link>
        )}
      />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">A carregar...</p>
        </div>
      }
    >
      <ProductionBoundary><AdminOrdersContent /></ProductionBoundary>
    </Suspense>
  );
}
