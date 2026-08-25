'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  Boxes,
  CheckCircle2,
  Clock,
  Factory,
  Package,
  Sparkles,
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
import { WorkflowJourney } from '@/components/workflow/WorkflowJourney';

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

  const quoteStatuses = useMemo(
    () =>
      stats
        ? Object.entries(stats.quotes.by_status)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
        : [],
    [stats]
  );

  const priorityItems = useMemo(
    () =>
      stats
        ? [
            {
              label: 'Novos pedidos por analisar',
              description: 'Confirmar briefing, prazo e informação do cliente.',
              value: stats.quotes.new,
              href: '/admin/orcamentos?status=received',
              tone: 'bg-sky-50 text-sky-700',
            },
            {
              label: 'Propostas aguardam decisão',
              description: 'Acompanhar clientes e manter a decisão em movimento.',
              value: stats.quotes.awaiting_approval,
              href: '/admin/orcamentos?status=quoted',
              tone: 'bg-amber-50 text-amber-700',
            },
            {
              label: 'Trabalhos em produção',
              description: 'Validar progresso, qualidade e possíveis bloqueios.',
              value: stats.orders.by_status.in_production || 0,
              href: '/admin/encomendas?status=in_production',
              tone: 'bg-violet-50 text-violet-700',
            },
            {
              label: 'Prontos para entrega',
              description: 'Coordenar entrega ou levantamento com o cliente.',
              value: stats.orders.by_status.ready || 0,
              href: '/admin/encomendas?status=ready',
              tone: 'bg-emerald-50 text-emerald-700',
            },
          ].filter((item) => item.value > 0)
        : [],
    [stats]
  );

  const actionCount = priorityItems.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    if (authLoading) return;
    getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas'));
  }, [authLoading]);

  if (authLoading || (!stats && !error)) {
    return (
      <div className="animate-pulse space-y-5" aria-label="A carregar dados da administração">
        <div className="h-48 rounded-3xl bg-[#e2e9e3]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
          <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
          <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
          <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-dark">Não foi possível carregar o painel</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68776f]">{error}</p>
        <Button type="button" className="mt-5" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-8 text-white shadow-[0_24px_60px_-38px_rgba(3,42,29,0.9)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-white/[0.035]" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-28 w-28 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-white/10">
              <Sparkles className="h-3.5 w-3.5" />
              Centro de trabalho da equipa
            </div>
            <h1 className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
              {actionCount > 0
                ? `${actionCount} ${actionCount === 1 ? 'trabalho pede' : 'trabalhos pedem'} acompanhamento.`
                : 'A operação está em dia.'}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
              Comece pelo que precisa de decisão e acompanhe cada trabalho desde o pedido até à entrega.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/orcamentos"
              className="inline-flex h-11 items-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
            >
              Rever pedidos
            </Link>
            <Link
              href="/admin/encomendas"
              className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-brand-900 transition hover:-translate-y-0.5 hover:bg-[#f4f0e8]"
            >
              Acompanhar produção
            </Link>
          </div>
        </div>
      </section>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="min-w-0 rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
                Prioridades agora
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">
                O que mantém o fluxo em movimento
              </h2>
            </div>
            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-brand-50 px-3 text-sm font-bold text-brand-800">
              {actionCount}
            </span>
          </div>

          <div className="mt-5 space-y-2.5">
            {priorityItems.length > 0 ? (
              priorityItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-2xl border border-[#e6ece7] p-3.5 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${item.tone}`}>
                    {item.value}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-dark">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-[#718078]">{item.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#829087] transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                </Link>
              ))
            ) : (
              <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <p className="text-sm font-semibold text-brand-900">Sem prioridades pendentes</p>
                  <p className="mt-1 text-xs leading-5 text-brand-800/70">
                    Novos pedidos e mudanças de estado aparecerão aqui.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f0e8] text-[#8d7040]">
              <Factory className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
                Percurso partilhado
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">
                Uma linguagem comum para a equipa e o cliente
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#718078]">
                A administração gere os detalhes; o cliente acompanha os mesmos momentos importantes de forma simples.
              </p>
            </div>
          </div>
          <WorkflowJourney compact className="mt-6" />
        </div>
      </section>

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

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-3xl border-[#dfe7e1] shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] lg:col-span-2">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Fluxo comercial</p>
            <h2 className="mb-5 mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">Orçamentos por estado</h2>
            <div className="flex flex-wrap gap-3">
              {quoteStatuses.map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-xl border border-[#dfe7e1] bg-[#fbfcfa] px-4 py-2.5"
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

        <Card className="rounded-3xl border-[#dfe7e1] shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Finanças</p>
            <h2 className="mb-5 mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">Resumo financeiro</h2>
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
        <Card className="rounded-3xl border-[#dfe7e1] shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark">Tendência de orçamentos (30 dias)</h2>
            <TrendChart data={stats.quotes_trend} color="bg-brand" />
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-[#dfe7e1] shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark">Tendência de encomendas (30 dias)</h2>
            <TrendChart data={stats.orders_trend} color="bg-green-500" />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-[#dfe7e1] shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
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
