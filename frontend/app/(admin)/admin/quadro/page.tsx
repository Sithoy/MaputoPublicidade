'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw, UserRoundPlus } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { getOrders, getQuotes } from '@/lib/admin-api';
import type { Order, Quote } from '@/lib/api';
import { cn } from '@/lib/utils';

type BoardCard = {
  key: string;
  type: 'quote' | 'order';
  reference: string;
  client: string;
  label: string;
  status: string;
  created_at: string;
  href: string;
  paymentLabel?: string;
  needsArtwork: boolean;
  sourceLabel?: string;
};

type BoardColumn = {
  key: string;
  label: string;
  description: string;
  match: (card: BoardCard) => boolean;
  tone: string;
};

const columns: BoardColumn[] = [
  {
    key: 'new',
    label: 'Novos pedidos',
    description: 'Por analisar',
    match: (c) => c.type === 'quote' && c.status === 'received',
    tone: 'border-t-sky-400',
  },
  {
    key: 'reviewing',
    label: 'Em análise',
    description: 'A preparar proposta',
    match: (c) => c.type === 'quote' && c.status === 'reviewing',
    tone: 'border-t-amber-400',
  },
  {
    key: 'awaiting_client',
    label: 'Aguarda cliente',
    description: 'Proposta ou arte por aprovar',
    match: (c) => c.status === 'quoted' || c.needsArtwork,
    tone: 'border-t-orange-400',
  },
  {
    key: 'approved',
    label: 'Aprovado',
    description: 'Pronto para produção',
    match: (c) => c.status === 'approved',
    tone: 'border-t-brand',
  },
  {
    key: 'production',
    label: 'Em produção',
    description: 'Em execução',
    match: (c) => c.status === 'in_production',
    tone: 'border-t-violet-400',
  },
  {
    key: 'ready',
    label: 'Pronto',
    description: 'Entrega ou levantamento',
    match: (c) => c.status === 'ready',
    tone: 'border-t-emerald-400',
  },
  {
    key: 'done',
    label: 'Concluído',
    description: 'Entregue',
    match: (c) => c.status === 'delivered',
    tone: 'border-t-gray-300',
  },
];

export default function AdminBoardPage() {
  const { loading: authLoading, can } = useAdminAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([getQuotes(), getOrders()])
      .then(([quoteData, orderData]) => {
        setQuotes(quoteData);
        setOrders(orderData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar o quadro'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const cards = useMemo<BoardCard[]>(() => {
    const quoteCards = quotes
      .filter((q) => q.status !== 'cancelled' && !q.order_reference)
      .map((q) => ({
        key: `quote-${q.id}`,
        type: 'quote' as const,
        reference: q.reference,
        client: q.client_company || q.client_name,
        label: q.item_count ? `${q.item_count} ${q.item_count === 1 ? 'item' : 'itens'}` : 'Pedido de orçamento',
        status: q.status,
        created_at: q.created_at,
        href: `/admin/orcamentos/${q.reference}`,
        needsArtwork: q.artwork_status === 'pending',
        sourceLabel: q.contact_source_display,
      }));
    const orderCards = orders
      .filter((o) => o.status !== 'cancelled')
      .map((o) => ({
        key: `order-${o.id}`,
        type: 'order' as const,
        reference: o.reference,
        client: o.client_name || o.user_name || o.user_email || 'Cliente',
        label: o.item_count ? `${o.item_count} ${o.item_count === 1 ? 'item' : 'itens'}` : 'Encomenda',
        status: o.status,
        created_at: o.created_at,
        href: `/admin/encomendas/${o.reference}`,
        paymentLabel:
          o.payment_status !== 'paid'
            ? o.payment_status_display || o.payment_status
            : undefined,
        needsArtwork: o.artwork_status === 'pending',
      }));
    return [...quoteCards, ...orderCards];
  }, [quotes, orders]);

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Quadro de produção</h1>
          <p className="text-sm text-gray-500">
            Todos os trabalhos em curso, por etapa. Clique num cartão para abrir o detalhe.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('intake.create') ? (
            <Link
              href="/admin/atendimento/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <UserRoundPlus className="h-4 w-4" />
              Novo atendimento
            </Link>
          ) : null}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe7e1] px-3 py-2 text-sm font-semibold text-[#5d6d65] transition hover:bg-white"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnCards = cards.filter(column.match);
          return (
            <div
              key={column.key}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-2xl border border-[#dfe7e1] border-t-4 bg-[#fafcfa]',
                column.tone
              )}
            >
              <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-4">
                <div>
                  <h2 className="text-sm font-bold text-dark">{column.label}</h2>
                  <p className="text-xs text-[#829087]">{column.description}</p>
                </div>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-white px-2 text-xs font-bold text-[#5d6d65] shadow-sm">
                  {columnCards.length}
                </span>
              </div>
              <div className="flex-1 space-y-2.5 p-3">
                {columnCards.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#dfe7e1] px-3 py-4 text-center text-xs text-[#9aa8a0]">
                    Sem trabalhos
                  </p>
                ) : (
                  columnCards.map((card) => (
                    <Link key={card.key} href={card.href} className="block">
                      <article className="group rounded-xl border border-[#e6ece7] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-brand-700">
                            {card.reference}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            {card.type === 'quote' ? 'Proposta' : 'Encomenda'}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-sm font-semibold text-dark">{card.client}</p>
                        <p className="mt-0.5 truncate text-xs text-[#718078]">{card.label}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={card.status} />
                          {card.paymentLabel ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                              {card.paymentLabel}
                            </span>
                          ) : null}
                          {card.needsArtwork ? (
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                              Arte por aprovar
                            </span>
                          ) : null}
                          {card.sourceLabel ? (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                              {card.sourceLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-[#9aa8a0]">
                          <span>{new Date(card.created_at).toLocaleDateString('pt-MZ')}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-[#b6c2ba] transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                        </div>
                      </article>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
