'use client';

import { useEffect, useState } from 'react';
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

  const recentStatuses = Object.entries(stats.quotes.by_status)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Dashboard</h1>
          <p className="text-sm text-gray-500">Visão geral do negócio</p>
        </div>
        <Link href="/admin/orcamentos">
          <Button>Ver encomendas</Button>
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de encomendas"
          value={stats.quotes.total}
          subtitle={`${stats.quotes.last_30_days} nos últimos 30 dias`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Pendentes"
          value={stats.quotes.pending}
          subtitle="Excluíndo entregues"
          icon={Clock}
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
            <h2 className="mb-4 text-lg font-semibold text-dark">Estado das encomendas</h2>
            <div className="flex flex-wrap gap-3">
              {recentStatuses.map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2"
                >
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium text-dark">{count}</span>
                </div>
              ))}
              {recentStatuses.length === 0 && (
                <p className="text-sm text-gray-500">Ainda não há encomendas.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark">Receita estimada</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Total estimado</p>
                <p className="text-2xl font-bold text-dark">
                  {stats.revenue.estimated_total.toLocaleString()} MZN
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Últimos 30 dias</p>
                <p className="text-2xl font-bold text-dark">
                  {stats.revenue.estimated_last_30_days.toLocaleString()} MZN
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor final</p>
                <p className="text-2xl font-bold text-dark">
                  {stats.revenue.final_total.toLocaleString()} MZN
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Categorias" value={stats.catalog.categories} icon={Boxes} />
        <StatCard title="Pacotes" value={stats.catalog.packages} icon={Package} />
        <StatCard
          title="Taxa de conversão estimada"
          value={
            stats.quotes.total
              ? `${Math.round((stats.revenue.final_total / Math.max(stats.revenue.estimated_total, 1)) * 100)}%`
              : '0%'
          }
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
