'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, RefreshCw, Search } from 'lucide-react';
import { getClientQuotes } from '@/lib/client-api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import type { Quote } from '@/lib/api';
import { clientOrderStatusLabels } from '@/lib/status';
import { formatMZN } from '@/lib/utils';

function quoteLabel(quote: Quote) {
  const items = quote.items ?? [];
  if (items.length === 1) return items[0].description;
  if (items.length > 1) return `${items[0].description} +${items.length - 1}`;
  if (quote.item_count === 1) return '1 item solicitado';
  if (quote.item_count && quote.item_count > 1) return `${quote.item_count} itens solicitados`;
  return 'Pedido de orçamento';
}

function needsDecision(quote: Quote) {
  return (
    quote.status === 'quoted' ||
    (quote.artwork?.status === 'pending' && quote.status !== 'cancelled')
  );
}

export default function ClientQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [search, setSearch] = useState('');

  function loadQuotes() {
    setLoading(true);
    setError('');
    getClientQuotes()
      .then(setQuotes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  const filtered = useMemo(() => {
    let data = [...quotes];
    if (filter === 'pending') {
      data = data.filter(needsDecision);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (q) =>
          q.reference.toLowerCase().includes(term) ||
          quoteLabel(q).toLowerCase().includes(term)
      );
    }
    return data;
  }, [quotes, filter, search]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-dark">Não foi possível carregar os orçamentos</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68776f]">{error}</p>
        <button
          type="button"
          onClick={loadQuotes}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Propostas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-dark">Orçamentos</h1>
          <p className="mt-1 text-sm text-[#718078]">
            Reveja as propostas da equipa e aprove para darmos início à produção.
          </p>
        </div>
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Iniciar novo pedido
        </Link>
      </div>

      <Card className="rounded-2xl border-[#dfe7e1] shadow-none">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9890]" />
            <Input
              className="pl-10"
              placeholder="Pesquisar por referência ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'pending' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              A aguardar decisão
            </Button>
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-[#dfe7e1]">
          <CardContent className="py-12 text-center text-[#718078]">
            {filter === 'pending'
              ? 'Nenhuma proposta a aguardar a sua decisão.'
              : 'Nenhum orçamento corresponde aos filtros seleccionados.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => (
            <Link key={quote.id} href={`/area-cliente/orcamentos/${quote.reference}`} className="block">
              <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)] transition hover:-translate-y-0.5 hover:border-brand-200">
                <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-700">
                        {quote.reference}
                      </span>
                      <Badge variant="outline">
                        {clientOrderStatusLabels[quote.status] || quote.status}
                      </Badge>
                      {needsDecision(quote) ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                          Decisão necessária
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 truncate font-semibold text-dark">{quoteLabel(quote)}</p>
                    <p className="mt-1 text-xs text-[#7b8981]">
                      {quote.item_count ?? quote.items?.length ?? 0} item(s) ·{' '}
                      {new Date(quote.created_at).toLocaleDateString('pt-MZ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                    <div className="sm:text-right">
                      {quote.final_price ? (
                        <p className="text-sm font-semibold text-dark">{formatMZN(quote.final_price)}</p>
                      ) : quote.estimated_price ? (
                        <p className="text-sm font-semibold text-dark">
                          {formatMZN(quote.estimated_price)}
                          <span className="block text-[11px] font-medium text-[#829087]">estimativa</span>
                        </p>
                      ) : (
                        <p className="text-sm text-[#829087]">Preço em análise</p>
                      )}
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
