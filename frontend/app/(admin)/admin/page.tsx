'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  Boxes,
  Clock,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { getStats } from '@/lib/admin-api';
import type { DashboardStats } from '@/lib/admin-api';

const statusLabels: Record<string, string> = {
  received: 'Pedido recebido',
  reviewing: 'Em análise',
  quoted: 'Orçamentado',
  approved: 'Aprovado',
  in_production: 'Em produção',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function TrendChart({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((point) => (
        <div
          key={point.date}
          className={`flex-1 rounded-sm ${color}`}
          style={{ height: `${(point.count / max) * 100}%`, minHeight: point.count ? 4 : 0 }}
          title={`${point.date}: ${point.count}`}
        />
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { loading: authLoading } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas'));
  }, [authLoading]);

  if (authLoading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  const quoteStatuses = useMemo(
    () =>
      Object.entries(stats.quotes.by_status)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a),
    [stats.quotes.by_status]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Dashboard</h1>
          <p className="text-sm text-gray-500">Visão geral do negócio</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/orcamentos">
            <Button variant="outline">Ver orçamentos</Button>
          </Link>
          <Link href="/admin/encomendas">
            <Button>Ver encomendas</Button>
          </Link>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Orçamentos"
          value={stats.quotes.total}
          subtitle={`${stats.quotes.last_30_days} nos últimos 30 dias`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Encomendas"
          value={stats.orders.total}
          subtitle={`${stats.orders.last_30_days} nos últimos 30 dias`}
          icon={Package}
        />
        <StatCard
          title="Produtos activos"
          value={stats.products.active}
          subtitle={`${stats.products.total} no total`}
          icon={Boxes}
        />
        <StatCard
          title="Utilizadores"
          value={stats.users.total}
          subtitle={`${stats.users.staff} administradores`}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark">Orçamentos por estado</h2>
            <div className="flex flex-wrap gap-3">
              {quoteStatuses.map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2"
                >
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium text-dark">{count}</span>
                </div>
              ))}
              {quoteStatuses.length === 0 && (
                <p className="text-sm text-gray-500">Ainda não há orçamentos.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark">Resumo financeiro</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Total estimado</p>
                <p className="text-2xl font-bold text-dark">
                  {stats.revenue.estimated_total.toLocaleString()} MZN
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor final</p>
                <p className="text-2xl font-bold text-dark">
                  {stats.revenue.final_total.toLocaleString()} MZN
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor pago</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.revenue.paid_total.toLocaleString()} MZN
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Novos pedidos"
          value={stats.quotes.new}
          subtitle="Recebidos / Em análise"
          icon={Clock}
        />
        <StatCard
          title="Aguardam aprovação"
          value={stats.quotes.awaiting_approval}
          subtitle="Orçamentados"
          icon={Banknote}
        />
        <StatCard
          title="Em dívida"
          value={`${stats.orders.amount_due_sum.toLocaleString()} MZN`}
          subtitle="Total em encomendas"
          icon={TrendingUp}
        />
        <StatCard
          title="Taxa de conversão"
          value={`${stats.conversion_rate}%`}
          subtitle="Encomendas / orçamentos"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark">Tendência de orçamentos (30 dias)</h2>
            <TrendChart data={stats.quotes_trend} color="bg-brand" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark">Tendência de encomendas (30 dias)</h2>
            <TrendChart data={stats.orders_trend} color="bg-green-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">Actividade recente</h2>
          {stats.recent_activity.length === 0 ? (
            <p className="text-sm text-gray-500">Sem actividade recente.</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_activity.map((item) => (
                <div
                  key={`${item.type}-${item.reference}`}
                  className="flex flex-col gap-1 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase text-gray-400">
                      {item.type === 'quote' ? 'Orçamento' : 'Encomenda'}
                    </span>
                    <span className="font-mono text-sm font-semibold text-brand">
                      {item.reference}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.client} • {new Date(item.created_at).toLocaleDateString('pt-MZ')}
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
