'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getClientOrders } from '@/lib/client-api';
import type { Order } from '@/lib/api';
import { cn, formatMZN } from '@/lib/utils';
import { WorkflowJourney } from '@/components/workflow/WorkflowJourney';
import { getClientNextAction, getOrderProgress } from '@/lib/workflow';
import { clientOrderStatusLabels } from '@/lib/status';

const statusStyles: Record<string, string> = {
  received: 'bg-sky-50 text-sky-700 ring-sky-200',
  reviewing: 'bg-amber-50 text-amber-700 ring-amber-200',
  quoted: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-brand-50 text-brand-700 ring-brand-200',
  in_production: 'bg-violet-50 text-violet-700 ring-violet-200',
  ready: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  delivered: 'bg-[#eff3f0] text-[#58685f] ring-[#dbe3dd]',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
};

function orderLabel(order: Order) {
  const items = order.items ?? [];
  if (items.length === 1) return items[0].description;
  if (items.length > 1) return `${items[0].description} +${items.length - 1}`;
  if (order.item_count === 1) return '1 item solicitado';
  if (order.item_count && order.item_count > 1) return `${order.item_count} itens solicitados`;
  return 'Pedido de produção';
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note: string;
  tone: 'green' | 'amber' | 'blue';
}) {
  const tones = {
    green: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
  };

  return (
    <div className="rounded-2xl border border-[#dfe7e1] bg-white p-5 shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6a7971]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">{value}</p>
          <p className="mt-1 text-xs text-[#829087]">{note}</p>
        </div>
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="A carregar resumo dos pedidos">
      <div className="h-48 rounded-3xl bg-[#e2e9e3]" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
        <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
        <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
      </div>
      <div className="h-64 rounded-3xl bg-[#e2e9e3]" />
    </div>
  );
}

export default function ClientDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await getClientOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled'),
    [orders]
  );

  const pendingApprovals = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'quoted' ||
          (order.artwork?.status === 'pending' && order.status !== 'cancelled')
      ),
    [orders]
  );

  const paymentsDue = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          order.payment_status !== 'paid' ? sum + (order.amount_due || 0) : sum,
        0
      ),
    [orders]
  );

  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);

  const attentionItems = useMemo(
    () =>
      activeOrders
        .map((order) => ({ order, action: getClientNextAction(order) }))
        .filter(({ action }) => action.actionRequired),
    [activeOrders]
  );

  const focusOrder = attentionItems[0]?.order || activeOrders[0] || null;

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-dark">Não foi possível abrir o seu resumo</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68776f]">{error}</p>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const needsAttention = attentionItems.length > 0;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-8 text-white shadow-[0_24px_60px_-38px_rgba(3,42,29,0.9)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-white/[0.035]" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-28 w-28 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-white/10">
            <Sparkles className="h-3.5 w-3.5" />
            O seu trabalho com a Maputo Publicidade
          </div>
          <h1 className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
            {needsAttention
              ? `${attentionItems.length} ${attentionItems.length === 1 ? 'decisão precisa' : 'decisões precisam'} da sua atenção.`
              : activeOrders.length > 0
                ? 'O seu trabalho está em movimento.'
                : 'Tudo começa com um pedido bem definido.'}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
            Da primeira conversa à entrega, veja onde cada trabalho está e saiba exactamente qual é o próximo passo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-900 transition hover:-translate-y-0.5 hover:bg-[#f4f0e8]"
            >
              <Plus className="h-4 w-4" />
              Iniciar novo pedido
            </Link>
            <Link
              href="/area-cliente/encomendas"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
            >
              Ver encomendas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo da conta">
        <StatCard
          icon={Package}
          label="Encomendas activas"
          value={activeOrders.length}
          note={activeOrders.length === 1 ? 'pedido em acompanhamento' : 'pedidos em acompanhamento'}
          tone="green"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Aprovações pendentes"
          value={pendingApprovals.length}
          note={pendingApprovals.length > 0 ? 'precisam da sua atenção' : 'nenhuma acção necessária'}
          tone="amber"
        />
        <StatCard
          icon={Banknote}
          label="Pagamentos pendentes"
          value={paymentsDue > 0 ? formatMZN(paymentsDue) : 'Em dia'}
          note={paymentsDue > 0 ? 'saldo total por regularizar' : 'sem valores pendentes'}
          tone="blue"
        />
      </section>

      <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
              Percurso do trabalho
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">
              {focusOrder ? `Onde está o pedido ${focusOrder.reference}` : 'Da ideia à entrega, sem perder o fio'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#718078]">
              {focusOrder
                ? getClientNextAction(focusOrder).description
                : 'Quando iniciar um pedido, poderá acompanhar aqui cada momento importante do processo.'}
            </p>
          </div>
          {focusOrder ? (
            <Link
              href={`/area-cliente/encomendas/${focusOrder.reference}`}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              Abrir pedido
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        <WorkflowJourney status={focusOrder?.status} compact className="mt-6" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.58fr]">
        <div className="rounded-3xl border border-[#dfe7e1] bg-[#f4f0e8] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d7040]">Próximos passos</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-dark">
                {needsAttention ? 'Precisa da sua atenção' : 'Tudo em dia por agora'}
              </h2>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#9b7535] shadow-sm">
              {needsAttention ? <Clock3 className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {attentionItems.slice(0, 3).map(({ order, action }) => (
              <Link
                key={order.id}
                href={`/area-cliente/encomendas/${order.reference}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-[#e3dac8] bg-white/75 p-4 transition hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-semibold text-[#9a763b]">{order.reference}</p>
                  <p className="mt-1 text-sm font-semibold text-dark">{action.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#7b7061]">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#a17b3b] transition group-hover:translate-x-0.5" />
              </Link>
            ))}

            {!needsAttention ? (
              <div className="rounded-2xl border border-[#e3dac8] bg-white/70 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  <p className="text-sm leading-6 text-[#706858]">
                    Não precisa de fazer nada agora. Quando houver uma proposta, prova digital ou entrega para confirmar, aparecerá aqui.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Actividade</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">Encomendas recentes</h2>
            </div>
            {recentOrders.length > 0 ? (
              <Link
                href="/area-cliente/encomendas"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
              >
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-dark">O seu primeiro pedido começa aqui</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#718078]">
                Explore o catálogo ou envie-nos o seu briefing para organizarmos a solução certa.
              </p>
              <Link
                href="/catalogo"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Explorar catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-[#edf1ee]">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/area-cliente/encomendas/${order.reference}`}
                  className="group flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-700">{order.reference}</span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
                          statusStyles[order.status] || 'bg-gray-50 text-gray-700 ring-gray-200'
                        )}
                      >
                        {order.status_display || clientOrderStatusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold text-dark">{orderLabel(order)}</p>
                    <p className="mt-1 text-xs text-[#7b8981]">
                      {order.item_count ?? order.items?.length ?? 0} item(s) ·{' '}
                      {new Date(order.created_at).toLocaleDateString('pt-MZ')}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#e7ece8]" aria-hidden="true">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${getOrderProgress(order.status)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[#718078]">
                        {getClientNextAction(order).label}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {order.amount_due ? (
                      <span className="text-sm font-semibold text-dark">{formatMZN(order.amount_due)}</span>
                    ) : null}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f6f3] text-[#64736b] transition group-hover:bg-brand-50 group-hover:text-brand-700">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
