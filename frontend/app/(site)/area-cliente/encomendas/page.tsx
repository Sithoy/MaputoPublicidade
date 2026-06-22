'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getClientOrders } from '@/lib/client-api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">As Minhas Encomendas</h1>
          <p className="text-sm text-gray-500">Acompanhe e aprove os seus pedidos.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'active' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Activas
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Pesquisar por referência ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            Nenhuma encomenda encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-brand">
                      {order.reference}
                    </span>
                    <Badge variant="outline">{statusLabels[order.status] || order.status}</Badge>
                  </div>
                  <p className="font-medium text-dark">{orderLabel(order)}</p>
                  <p className="text-xs text-gray-500">
                    {order.item_count} item(s) • {new Date(order.created_at).toLocaleDateString('pt-MZ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {order.amount_due ? (
                    <span className="text-sm font-semibold text-dark">
                      {order.amount_due.toLocaleString()} MZN
                    </span>
                  ) : null}
                  <Link href={`/area-cliente/encomendas/${order.reference}`}>
                    <Button variant="outline" size="sm">Ver detalhes</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
