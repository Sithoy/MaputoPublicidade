'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ReceiptText, Search } from 'lucide-react';
import { getClientInvoices } from '@/lib/client-api';
import type { Invoice } from '@/lib/api';
import { formatMZN } from '@/lib/utils';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setInvoices(await getClientInvoices());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as faturas.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const issued = invoices.filter((invoice) => invoice.status === 'issued');
  const balance = issued.reduce((sum, invoice) => sum + Number(invoice.balance_due), 0);
  const visible = invoices.filter((invoice) =>
    (!status || invoice.status === status) &&
    `${invoice.reference} ${invoice.order_reference || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-brand-900 p-6 text-white sm:p-8">
        <ReceiptText className="h-7 w-7 text-brand-200" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">As suas faturas, sempre à mão.</h1>
        <p className="mt-2 text-sm leading-6 text-white/75">Consulte valores, acompanhe pagamentos e descarregue os documentos da sua empresa.</p>
      </section>
      {loading ? <p role="status" className="p-6 text-sm text-[#68776f]">A carregar faturas...</p> : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">Tentar novamente</button></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Por regularizar', value: formatMZN(balance) },
              { label: 'Faturas emitidas', value: String(issued.length) },
              { label: 'Faturas pagas', value: String(invoices.filter((invoice) => invoice.status === 'paid').length) },
            ].map((metric) => <div key={metric.label} className="rounded-2xl border border-[#dfe7e1] bg-white p-5"><p className="text-sm text-[#68776f]">{metric.label}</p><p className="mt-2 text-2xl font-semibold text-dark">{metric.value}</p></div>)}
          </div>
          <section className="overflow-hidden rounded-3xl border border-[#dfe7e1] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#edf1ee] p-5 sm:flex-row">
              <label className="relative flex-1"><span className="sr-only">Pesquisar fatura ou projeto</span><Search className="absolute left-3 top-3 h-4 w-4 text-[#829087]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar fatura ou projeto" className="h-10 w-full rounded-xl border border-[#dfe7e1] pl-10 pr-3 text-sm" /></label>
              <label><span className="sr-only">Estado da fatura</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-[#dfe7e1] px-3 text-sm"><option value="">Todos os estados</option><option value="issued">Emitidas</option><option value="paid">Pagas</option><option value="cancelled">Anuladas</option></select></label>
            </div>
            {visible.length ? <div className="divide-y divide-[#edf1ee]">{visible.map((invoice) => (
              <Link key={invoice.id} href={`/area-cliente/faturas/${invoice.reference}`} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-brand-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand">
                <div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-dark">{invoice.reference}</span><StatusBadge status={invoice.status} label={invoice.status_display} /></div><p className="mt-2 text-xs text-[#829087]">Emitida em {new Date(`${invoice.issue_date}T00:00:00`).toLocaleDateString('pt-MZ')} · {invoice.order_reference || 'Fatura independente'}</p></div>
                <div className="flex items-center gap-4"><div className="text-right"><p className="font-semibold text-dark">{formatMZN(invoice.total)}</p><p className="mt-1 text-xs text-[#829087]">{invoice.status === 'cancelled' ? 'Anulada' : `Saldo: ${formatMZN(invoice.balance_due)}`}</p></div><ArrowUpRight className="h-4 w-4 text-brand-700" aria-hidden="true" /></div>
              </Link>
            ))}</div> : <p className="p-10 text-center text-sm text-[#829087]">{invoices.length ? 'Nenhuma fatura corresponde à pesquisa.' : 'As faturas emitidas pela equipa MP aparecerão aqui.'}</p>}
          </section>
        </>
      )}
    </div>
  );
}
