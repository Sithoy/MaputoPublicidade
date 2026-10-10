'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { getClientInvoice, downloadClientInvoicePdf } from '@/lib/client-api';
import type { Invoice } from '@/lib/api';
import { InvoiceDocument } from '@/components/admin/InvoiceDocument';
import { SupportContextLink } from '@/components/SupportContext';
import { formatMZN } from '@/lib/utils';

export default function ClientInvoiceDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInvoice(null);
    setError('');
    getClientInvoice(reference).then((data) => { if (!cancelled) setInvoice(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível abrir a fatura.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reference, retry]);

  async function download() {
    setDownloading(true);
    setError('');
    try { await downloadClientInvoicePdf(reference); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível descarregar a fatura.'); }
    finally { setDownloading(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/area-cliente/faturas" className="flex items-center gap-2 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Voltar às faturas</Link>
        {invoice && !loading ? <button type="button" disabled={downloading} onClick={() => void download()} className="flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{downloading ? 'A descarregar...' : 'Descarregar PDF'}</button> : null}
      </div>
      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}{!invoice ? <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-3 font-semibold underline">Tentar novamente</button> : null}</div> : null}
      {loading ? <p role="status" className="p-8 text-sm text-[#68776f]">A carregar fatura...</p> : invoice ? <>
        <SupportContextLink kind="invoice" reference={invoice.reference} />
        <div className="rounded-2xl border border-[#dfe7e1] bg-white p-5 text-sm text-[#68776f]">
          {invoice.status === 'cancelled' ? 'Esta fatura foi anulada.' : invoice.status === 'paid' ? 'Pagamento confirmado. Obrigado pela sua confiança.' : `Saldo por regularizar: ${formatMZN(invoice.balance_due)}. Consulte os dados bancários e as condições de pagamento no documento.`}
        </div>
        <InvoiceDocument invoice={invoice} audience="client" />
      </> : null}
    </div>
  );
}
