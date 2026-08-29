'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, FileDown, Plus, Search } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/admin/DataTable';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { exportQuotes, getQuotes } from '@/lib/admin-api';
import type { Quote } from '@/lib/api';
import { quoteLabel } from '@/lib/quote-label';
import { orderStatusLabels, orderStatusOptions } from '@/lib/status';
import { formatMZN } from '@/lib/utils';

function AdminQuotesContent() {
  const { loading: authLoading, can } = useAdminAuth();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') ?? '';
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filtered, setFiltered] = useState<Quote[]>([]);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Keep the filter in sync with ?status= links (e.g. from the dashboard).
  useEffect(() => {
    setStatusFilter(urlStatus && orderStatusLabels[urlStatus] ? urlStatus : '');
  }, [urlStatus]);

  useEffect(() => {
    if (authLoading) return;
    getQuotes()
      .then((data) => {
        setQuotes(data);
        setFiltered(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar orçamentos'));
  }, [authLoading]);

  useEffect(() => {
    let data = [...quotes];
    if (statusFilter) data = data.filter((q) => q.status === statusFilter);
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (q) =>
          q.reference.toLowerCase().includes(term) ||
          quoteLabel(q).toLowerCase().includes(term)
      );
    }
    setFiltered(data);
  }, [quotes, statusFilter, search]);

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
          <h1 className="text-2xl font-bold text-dark">Orçamentos</h1>
          <p className="text-sm text-gray-500">Gestão de orçamentos e pedidos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('quotes.manage') ? (
            <Link
              href="/admin/orcamentos/novo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(8,114,71,0.75)] transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Novo orçamento
            </Link>
          ) : null}
        {can('quotes.export') ? <>
          <Button variant="outline" size="sm" onClick={() => exportQuotes('csv', statusFilter ? { status: statusFilter } : {})} className="gap-2">
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportQuotes('xlsx', statusFilter ? { status: statusFilter } : {})} className="gap-2">
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </> : null}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar por referência ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {orderStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          { key: 'reference', header: 'Referência' },
          {
            key: 'description',
            header: 'Produto / Serviço',
            render: (item) => quoteLabel(item),
          },
          {
            key: 'item_count',
            header: 'Itens',
            render: (item) => item.item_count,
          },
          {
            key: 'status',
            header: 'Estado',
            render: (item) => item.status_display || item.status,
          },
          {
            key: 'estimated_price',
            header: 'Preço estimado',
            render: (item) =>
              item.estimated_price ? formatMZN(item.estimated_price) : '-',
          },
          {
            key: 'created_at',
            header: 'Data',
            render: (item) => new Date(item.created_at).toLocaleDateString('pt-MZ'),
          },
        ]}
        data={filtered}
        actions={(item) => (
          <Link
            href={`/admin/orcamentos/${item.reference}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD8D0] bg-white px-3 py-1.5 text-sm font-semibold text-dark transition hover:border-brand/40 hover:bg-brand-50"
          >
            <Eye className="h-4 w-4" />
            Ver
          </Link>
        )}
      />
    </div>
  );
}

export default function AdminQuotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">A carregar...</p>
        </div>
      }
    >
      <AdminQuotesContent />
    </Suspense>
  );
}
