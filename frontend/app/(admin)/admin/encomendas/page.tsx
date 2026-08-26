'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Edit, FileDown, Search } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/admin/DataTable';
import { exportOrders, getOrders } from '@/lib/admin-api';
import type { Order } from '@/lib/api';
import { orderStatusLabels, orderStatusOptions } from '@/lib/status';
import { formatMZN } from '@/lib/utils';

function orderLabel(order: Order) {
  if (order.items.length === 0) return 'Encomenda';
  if (order.items.length === 1) return order.items[0].description;
  return `${order.items[0].description} +${order.items.length - 1}`;
}

function AdminOrdersContent() {
  const { loading: authLoading } = useAdminAuth();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') ?? '';
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    loadOrders();
  }, [authLoading]);

  // Keep the filter in sync with ?status= links (e.g. from the dashboard).
  useEffect(() => {
    setStatusFilter(urlStatus && orderStatusLabels[urlStatus] ? urlStatus : '');
  }, [urlStatus]);

  useEffect(() => {
    let data = [...orders];
    if (statusFilter) data = data.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (o) =>
          o.reference.toLowerCase().includes(term) ||
          orderLabel(o).toLowerCase().includes(term) ||
          o.user_email?.toLowerCase().includes(term)
      );
    }
    setFiltered(data);
  }, [orders, statusFilter, search]);

  async function loadOrders() {
    try {
      const data = await getOrders();
      setOrders(data);
      setFiltered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar encomendas');
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Encomendas</h1>
          <p className="text-sm text-gray-500">Gerir encomendas e fluxo de produção</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportOrders('csv', statusFilter ? { status: statusFilter } : {})} className="gap-2">
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportOrders('xlsx', statusFilter ? { status: statusFilter } : {})} className="gap-2">
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar por referência, produto ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {orderStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          { key: 'reference', header: 'Referência' },
          {
            key: 'description',
            header: 'Produto / Serviço',
            render: (item) => orderLabel(item),
          },
          { key: 'user_email', header: 'Cliente' },
          {
            key: 'status',
            header: 'Estado',
            render: (item) => orderStatusLabels[item.status] || item.status,
          },
          {
            key: 'payment_status',
            header: 'Pagamento',
            render: (item) => item.payment_status_display || item.payment_status,
          },
          {
            key: 'final_price',
            header: 'Preço final',
            render: (item) => (item.final_price ? formatMZN(item.final_price) : '-'),
          },
        ]}
        data={filtered}
        actions={(item) => (
          <Link href={`/admin/encomendas/${item.reference}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Gerir
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
      <AdminOrdersContent />
    </Suspense>
  );
}
