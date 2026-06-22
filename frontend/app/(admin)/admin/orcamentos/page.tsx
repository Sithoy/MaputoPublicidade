'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Search } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/admin/DataTable';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getQuotes } from '@/lib/admin-api';
import type { Quote } from '@/lib/api';

const statusOptions = [
  { value: '', label: 'Todos os estados' },
  { value: 'received', label: 'Recebido' },
  { value: 'reviewing', label: 'Em revisão' },
  { value: 'quoted', label: 'Orçamentado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'in_production', label: 'Em produção' },
  { value: 'ready', label: 'Pronto' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

function quoteLabel(quote: Quote) {
  if (quote.items.length === 0) return 'Orçamento';
  if (quote.items.length === 1) return quote.items[0].description;
  return `${quote.items[0].description} +${quote.items.length - 1}`;
}

export default function AdminQuotesPage() {
  const { loading: authLoading } = useAdminAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filtered, setFiltered] = useState<Quote[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

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
            {statusOptions.map((opt) => (
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
              item.estimated_price ? `${item.estimated_price.toLocaleString()} MZN` : '-',
          },
          {
            key: 'created_at',
            header: 'Data',
            render: (item) => new Date(item.created_at).toLocaleDateString('pt-MZ'),
          },
        ]}
        data={filtered}
        actions={(item) => (
          <Link href={`/admin/orcamentos/${item.reference}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Ver
            </Button>
          </Link>
        )}
      />
    </div>
  );
}
