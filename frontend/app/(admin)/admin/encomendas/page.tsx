'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit, FileDown, Search } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/admin/DataTable';
import { exportOrders, getOrders } from '@/lib/admin-api';
import type { Order } from '@/lib/api';

const statusLabels: Record<string, string> = {
  received: 'Pedido recebido',
  reviewing: 'Em análise',
  quoted: 'Orçamentado',
  approved: 'Aprovado',
  in_production: 'Em produção',
  ready: 'Pronto para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function orderLabel(order: Order) {
  if (order.items.length === 0) return 'Encomenda';
  if (order.items.length === 1) return order.items[0].description;
  return `${order.items[0].description} +${order.items.length - 1}`;
}

export default function AdminOrdersPage() {
  const { loading: authLoading } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    loadOrders();
  }, [authLoading]);

  useEffect(() => {
    let data = [...orders];
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
  }, [orders, search]);

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
          <Button variant="outline" size="sm" onClick={() => exportOrders('csv')} className="gap-2">
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportOrders('xlsx')} className="gap-2">
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar por referência, produto ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
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
            render: (item) => statusLabels[item.status] || item.status,
          },
          {
            key: 'payment_status',
            header: 'Pagamento',
            render: (item) => item.payment_status_display || item.payment_status,
          },
          {
            key: 'final_price',
            header: 'Preço final',
            render: (item) => (item.final_price ? `${item.final_price.toLocaleString()} MZN` : '-'),
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
