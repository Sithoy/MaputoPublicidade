'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileArchive,
  FileCheck2,
  FileText,
  Landmark,
  Library,
  PackageCheck,
  Palette,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import type { BrandAsset, Invoice, Order, Quote, User } from '@/lib/api';
import { BrandLibraryFileLink } from '@/components/BrandLibraryFile';
import { cn, formatMZN } from '@/lib/utils';

export type ClientWorkspaceData = {
  quotes: Quote[];
  orders: Order[];
  invoices: Invoice[];
  assets: BrandAsset[];
};

type ClientWorkspaceProps = ClientWorkspaceData & {
  user: User;
  loading?: boolean;
  error?: string;
};

type TimelineEntry = {
  key: string;
  title: string;
  detail: string;
  date: string;
  href: string;
  icon: typeof FileText;
  tone: string;
};

const ACTIVE_ORDER_STATUSES = new Set([
  'received',
  'reviewing',
  'quoted',
  'approved',
  'in_production',
  'ready',
]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function clientDisplayName(user: User) {
  return user.profile?.company || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#829087]">{label}</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-dark">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 text-xs text-[#829087]">{note}</p>
      </CardContent>
    </Card>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#edf1ee] px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-semibold text-dark">{title}</h3>
        <p className="mt-0.5 text-xs text-[#829087]">{description}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-32 items-center justify-center px-6 py-8 text-center text-sm text-[#829087]">
      {children}
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4" aria-label="A carregar visão do cliente" role="status">
      <div className="h-24 animate-pulse rounded-3xl bg-[#edf2ee]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl bg-[#edf2ee]" />
        ))}
      </div>
    </div>
  );
}

function buildTimeline(quotes: Quote[], orders: Order[], invoices: Invoice[]): TimelineEntry[] {
  return [
    ...quotes.map((quote) => ({
      key: `quote-${quote.id}`,
      title: `Orçamento ${quote.reference}`,
      detail: quote.status_display || quote.status,
      date: quote.created_at,
      href: `/admin/orcamentos/${quote.reference}`,
      icon: FileText,
      tone: 'bg-amber-50 text-amber-700',
    })),
    ...orders.map((order) => ({
      key: `order-${order.id}`,
      title: `Trabalho ${order.reference}`,
      detail: order.job_summary || order.status_display || order.status,
      date: order.created_at,
      href: `/admin/encomendas/${order.reference}`,
      icon: BriefcaseBusiness,
      tone: 'bg-violet-50 text-violet-700',
    })),
    ...invoices.map((invoice) => ({
      key: `invoice-${invoice.id}`,
      title: `Fatura ${invoice.reference}`,
      detail: invoice.status_display || invoice.status,
      date: invoice.created_at,
      href: `/admin/faturas/${invoice.reference}`,
      icon: ReceiptText,
      tone: 'bg-sky-50 text-sky-700',
    })),
  ]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 8);
}

export function ClientWorkspace({
  user,
  quotes,
  orders,
  invoices,
  assets,
  loading = false,
  error = '',
}: ClientWorkspaceProps) {
  if (loading) return <WorkspaceSkeleton />;

  const activeOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status));
  const pendingApprovals = quotes.filter(
    (quote) => quote.status === 'quoted' || quote.artwork_status === 'pending'
  );
  const outstandingBalance = invoices
    .filter((invoice) => invoice.status === 'issued')
    .reduce((total, invoice) => total + Number(invoice.balance_due || 0), 0);
  const timeline = buildTimeline(quotes, orders, invoices);
  const latestOrders = activeOrders.slice(0, 5);
  const latestApprovals = pendingApprovals.slice(0, 5);
  const latestInvoices = invoices.slice(0, 5);
  const latestAssets = assets.slice(0, 4);

  return (
    <section className="space-y-4" aria-labelledby="client-workspace-title">
      <div className="overflow-hidden rounded-3xl border border-brand-900/10 bg-[linear-gradient(125deg,#083f2c_0%,#0e5940_58%,#16805a_100%)] px-6 py-6 text-white shadow-[0_24px_60px_-38px_rgba(6,63,43,0.9)] sm:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Cliente 360
            </p>
            <h2 id="client-workspace-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              {clientDisplayName(user)} num único lugar
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/80">
              A mesma relação que o cliente acompanha no BrandDesk, organizada para a equipa MP agir sobre trabalhos, aprovações e faturação.
            </p>
          </div>
          <div className="grid min-w-fit grid-cols-2 gap-2 text-xs sm:flex">
            <span className="rounded-full bg-white/10 px-3 py-2 font-medium backdrop-blur">
              {orders.length} trabalhos
            </span>
            <span className="rounded-full bg-white/10 px-3 py-2 font-medium backdrop-blur">
              {assets.length} ficheiros de marca
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          {error} Alguns dados do cliente podem não estar visíveis.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BriefcaseBusiness}
          label="Trabalhos activos"
          value={String(activeOrders.length)}
          note="em preparação, produção ou entrega"
          tone="bg-violet-50 text-violet-700"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Aprovações pendentes"
          value={String(pendingApprovals.length)}
          note="a aguardar uma decisão do cliente"
          tone="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={Library}
          label="Biblioteca da marca"
          value={String(assets.length)}
          note="ficheiros disponíveis no BrandDesk"
          tone="bg-sky-50 text-sky-700"
        />
        <MetricCard
          icon={WalletCards}
          label="Saldo por regularizar"
          value={formatMZN(outstandingBalance)}
          note="em faturas actualmente emitidas"
          tone="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
          <PanelHeader
            icon={PackageCheck}
            title="Trabalhos em curso"
            description="O que a Maputo Publicidade está a executar agora."
          />
          {latestOrders.length ? (
            <div className="divide-y divide-[#edf1ee]">
              {latestOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/encomendas/${order.reference}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#f7f9f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-dark">{order.reference}</span>
                      <StatusBadge status={order.status} label={order.status_display} />
                    </div>
                    <p className="mt-1 truncate text-sm text-[#6a7971]">
                      {order.job_summary || 'Trabalho sem descrição'}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9aa69f] transition group-hover:text-brand-700" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel>Este cliente não tem trabalhos activos.</EmptyPanel>
          )}
        </Card>

        <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
          <PanelHeader
            icon={FileCheck2}
            title="Decisões do cliente"
            description="Orçamentos e artes que precisam de aprovação."
          />
          {latestApprovals.length ? (
            <div className="divide-y divide-[#edf1ee]">
              {latestApprovals.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/admin/orcamentos/${quote.reference}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#f7f9f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-dark">{quote.reference}</span>
                      <StatusBadge status={quote.status} label={quote.status_display} />
                    </div>
                    <p className="mt-1 text-sm text-[#6a7971]">
                      {quote.artwork_status === 'pending' ? 'Arte enviada para aprovação' : 'Orçamento enviado ao cliente'}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9aa69f] transition group-hover:text-brand-700" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel>Não existem decisões pendentes deste cliente.</EmptyPanel>
          )}
        </Card>

        <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
          <PanelHeader
            icon={Palette}
            title="Biblioteca da marca"
            description="Logótipos, guias e ficheiros enviados pelo cliente."
          />
          {latestAssets.length ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {latestAssets.map((asset) => (
                <BrandLibraryFileLink
                  key={asset.id}
                  url={asset.file}
                  filename={asset.file_name || asset.name}
                  className="group block w-full rounded-xl border border-[#e4eae6] bg-[#fafbfa] p-4 text-left transition hover:border-brand-200 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="flex items-start justify-between gap-3">
                    <FileArchive className="h-5 w-5 text-brand-700" aria-hidden="true" />
                    <ArrowUpRight className="h-4 w-4 text-[#9aa69f] group-hover:text-brand-700" aria-hidden="true" />
                  </div>
                  <p className="mt-4 truncate text-sm font-semibold text-dark">{asset.name}</p>
                  <p className="mt-1 text-xs text-[#829087]">{asset.kind_display || asset.kind}</p>
                </BrandLibraryFileLink>
              ))}
            </div>
          ) : (
            <EmptyPanel>A biblioteca da marca ainda não tem ficheiros.</EmptyPanel>
          )}
        </Card>

        <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
          <PanelHeader
            icon={Landmark}
            title="Posição financeira"
            description="Faturas ligadas à conta e respetivo saldo."
          />
          {latestInvoices.length ? (
            <div className="divide-y divide-[#edf1ee]">
              {latestInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/admin/faturas/${invoice.reference}`}
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-[#f7f9f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-dark">{invoice.reference}</span>
                      <StatusBadge status={invoice.status} label={invoice.status_display} />
                    </div>
                    <p className="mt-1 text-xs text-[#829087]">Vence em {formatDate(invoice.due_date)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-dark">{formatMZN(invoice.total)}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-[#829087]">
                      Saldo {formatMZN(invoice.balance_due)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel>Não existem faturas associadas a esta conta.</EmptyPanel>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
        <PanelHeader
          icon={Clock3}
          title="Histórico da relação"
          description="Uma linha cronológica dos movimentos comerciais e operacionais."
        />
        {timeline.length ? (
          <div className="grid gap-x-8 px-5 py-2 md:grid-cols-2">
            {timeline.map((entry) => {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.key}
                  href={entry.href}
                  className="group flex gap-3 border-b border-[#edf1ee] py-4 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', entry.tone)}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-dark group-hover:text-brand-700">{entry.title}</p>
                      <time className="shrink-0 text-xs text-[#9aa69f]" dateTime={entry.date}>
                        {formatDate(entry.date)}
                      </time>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#829087]">{entry.detail}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyPanel>A relação com este cliente ainda não tem movimentos registados.</EmptyPanel>
        )}
      </Card>
    </section>
  );
}
