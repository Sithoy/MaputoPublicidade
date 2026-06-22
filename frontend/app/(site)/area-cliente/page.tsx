'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getClientOrders } from '@/lib/client-api';
import type { Order } from '@/lib/api';

function orderLabel(order: Order) {
  if (order.items.length === 0) return 'Encomenda';
  if (order.items.length === 1) return order.items[0].description;
  return `${order.items[0].description} +${order.items.length - 1}`;
}

export default function ClientDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled'),
    [orders]
  );

  const pendingApprovals = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === 'quoted' ||
          (o.artwork && o.artwork.status === 'pending' && o.status !== 'cancelled')
      ),
    [orders]
  );

  const paymentsDue = useMemo(
    () =>
      orders
        .filter((o) => o.payment_status !== 'paid' && (o.amount_due || 0) > 0)
        .reduce((sum, o) => sum + (o.amount_due || 0), 0),
    [orders]
  );

  const recent = useMemo(() => orders.slice(0, 5), [orders]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumo das suas encomendas e pedidos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-brand/10 p-3 text-brand">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Encomendas activas</p>
              <p className="text-2xl font-bold text-dark">{activeOrders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-yellow-100 p-3 text-yellow-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aprovações pendentes</p>
              <p className="text-2xl font-bold text-dark">{pendingApprovals.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-green-100 p-3 text-green-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pagamentos pendentes</p>
              <p className="text-2xl font-bold text-dark">
                {paymentsDue > 0 ? `${paymentsDue.toLocaleString()} MZN` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark">Encomendas recentes</h2>
            <Link href="/area-cliente/encomendas">
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>Ainda não tem encomendas.</p>
              <Link href="/catalogo">
                <Button className="mt-4">Ver catálogo</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-brand">
                        {order.reference}
                      </span>
                      <Badge variant="outline">{order.status_display || order.status}</Badge>
                    </div>
                    <p className="font-medium text-dark">{orderLabel(order)}</p>
                    <p className="text-xs text-gray-500">
                      {order.item_count} item(s) • {new Date(order.created_at).toLocaleDateString('pt-MZ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.amount_due ? (
                      <p className="text-sm font-semibold text-dark">
                        {order.amount_due.toLocaleString()} MZN
                      </p>
                    ) : null}
                    <Link href={`/area-cliente/encomendas/${order.reference}`}>
                      <Button variant="outline" size="sm">Ver</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
