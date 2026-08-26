'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, FileDown, Plus, Search } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { exportInvoices, getInvoices } from '@/lib/admin-api';
import type { Invoice } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatMZN } from '@/lib/utils';

const invoiceStatuses = [
  { value: '', label: 'Todos os estados' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'issued', label: 'Emitida' },
  { value: 'paid', label: 'Paga' },
  { value: 'cancelled', label: 'Anulada' },
];

export default function InvoicesPage() {
  const { loading: authLoading, can } = useAdminAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    getInvoices()
      .then(setInvoices)
      .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar faturas')));
  }, [authLoading]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (status && invoice.status !== status) return false;
      if (!term) return true;
      return [invoice.reference, invoice.client_name, invoice.client_company, invoice.order_reference]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [invoices, search, status]);

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">A carregar...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Faturas</h1>
          <p className="text-sm text-gray-500">Emissão, acompanhamento e exportação de documentos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('invoices.manage') ? (
            <Link
              href="/admin/faturas/nova"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(8,114,71,0.75)] transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Nova fatura
            </Link>
          ) : null}
          {can('invoices.export') ? (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => exportInvoices('csv', status ? { status } : {})}>
                <FileDown className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => exportInvoices('xlsx', status ? { status } : {})}>
                <FileDown className="h-4 w-4" /> Excel
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por fatura, cliente ou encomenda..."
              className="pl-10"
            />
          </div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="sm:w-52">
            {invoiceStatuses.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <DataTable
        data={filtered}
        emptyText="Ainda não existem faturas."
        columns={[
          { key: 'reference', header: 'Fatura' },
          {
            key: 'client',
            header: 'Cliente',
            render: (invoice) => (
              <div>
                <p className="font-medium text-dark">{invoice.client_name}</p>
                {invoice.client_company ? <p className="text-xs text-gray-500">{invoice.client_company}</p> : null}
              </div>
            ),
          },
          {
            key: 'issue_date',
            header: 'Emissão',
            render: (invoice) => new Date(`${invoice.issue_date}T00:00:00`).toLocaleDateString('pt-MZ'),
          },
          {
            key: 'status',
            header: 'Estado',
            render: (invoice) => <StatusBadge status={invoice.status} label={invoice.status_display} />,
          },
          { key: 'total', header: 'Total', render: (invoice) => formatMZN(invoice.total) },
          { key: 'balance_due', header: 'Em dívida', render: (invoice) => formatMZN(invoice.balance_due) },
        ]}
        actions={(invoice) => (
          <Link
            href={`/admin/faturas/${invoice.reference}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD8D0] bg-white px-3 py-1.5 text-sm font-semibold text-dark transition hover:border-brand/40 hover:bg-brand-50"
          >
            <Eye className="h-4 w-4" /> Ver
          </Link>
        )}
      />
    </div>
  );
}
