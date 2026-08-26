'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getQuote, type AdminQuote } from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { companyProfile } from '@/lib/company';
import { formatMZN } from '@/lib/utils';

export default function PrintableQuotePage() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [quote, setQuote] = useState<AdminQuote | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !reference) return;
    getQuote(reference)
      .then(setQuote)
      .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar proposta')));
  }, [authLoading, reference]);

  if (authLoading || !quote) {
    return <div className="flex h-64 items-center justify-center text-gray-500">{error || 'A carregar...'}</div>;
  }

  const itemSubtotal = quote.items.reduce(
    (total, item) => total + (item.unit_price ?? 0) * item.quantity,
    0
  );
  const documentTotal = quote.final_price ?? quote.estimated_price ?? itemSubtotal;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="print-hidden flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/orcamentos/${quote.reference}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
        </Button>
      </div>

      <article className="print-document overflow-hidden rounded-2xl border border-[#dfe7e1] bg-white shadow-sm">
        <div className="border-b border-[#e3e9e5] bg-[#f7faf7] px-8 py-7 sm:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Image src="/logo-tight.png" alt="Maputo Publicidade" width={180} height={68} className="h-14 w-auto object-contain" priority />
              <p className="mt-3 text-sm text-gray-600">{companyProfile.legalName}</p>
              {companyProfile.nuit ? <p className="text-sm text-gray-500">NUIT: {companyProfile.nuit}</p> : null}
              <p className="text-sm text-gray-500">{companyProfile.address}</p>
              <p className="text-sm text-gray-500">{companyProfile.email}</p>
              {companyProfile.phone ? <p className="text-sm text-gray-500">{companyProfile.phone}</p> : null}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Proposta comercial</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-dark">{quote.reference}</h1>
              <div className="mt-3 inline-flex"><StatusBadge status={quote.status} /></div>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-8 py-8 sm:px-12">
          <div className="grid gap-6 border-b border-[#e6ebe7] pb-7 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Preparado para</p>
              <p className="mt-2 text-lg font-semibold text-dark">{quote.client_company || quote.client_name}</p>
              {quote.client_company ? <p className="text-sm text-gray-600">{quote.client_name}</p> : null}
              <p className="mt-1 text-sm text-gray-600">{quote.client_email}</p>
              {quote.client_phone ? <p className="text-sm text-gray-600">{quote.client_phone}</p> : null}
            </div>
            <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3 text-sm sm:ml-auto sm:min-w-64">
              <dt className="text-gray-500">Data</dt>
              <dd className="text-right font-medium text-dark">{new Date(quote.created_at).toLocaleDateString('pt-MZ')}</dd>
              <dt className="text-gray-500">Prioridade</dt>
              <dd className="text-right font-medium text-dark">{quote.urgency_display || 'Normal'}</dd>
              <dt className="text-gray-500">Moeda</dt>
              <dd className="text-right font-medium text-dark">MZN</dd>
            </dl>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b-2 border-brand-800 text-left text-xs uppercase tracking-[0.08em] text-gray-500">
                  <th className="py-3 pr-4 font-semibold">Descrição</th>
                  <th className="px-3 py-3 text-right font-semibold">Qtd.</th>
                  <th className="px-3 py-3 text-right font-semibold">Preço unit.</th>
                  <th className="py-3 pl-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-b border-[#edf1ee]">
                    <td className="py-4 pr-4"><p className="font-medium text-dark">{item.description}</p>{item.notes ? <p className="mt-1 text-xs text-gray-500">{item.notes}</p> : null}</td>
                    <td className="px-3 py-4 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-4 text-right text-gray-600">{item.unit_price != null ? formatMZN(item.unit_price) : 'A definir'}</td>
                    <td className="py-4 pl-3 text-right font-semibold text-dark">{item.unit_price != null ? formatMZN(item.unit_price * item.quantity) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-sm rounded-xl bg-brand-50 px-5 py-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold text-dark">Total da proposta</span>
                <strong className="text-xl text-brand-900">{formatMZN(documentTotal)}</strong>
              </div>
            </div>
          </div>

          {quote.notes ? (
            <div className="border-t border-[#e6ebe7] pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Observações</p>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{quote.notes}</p>
            </div>
          ) : null}
          <p className="border-t border-[#e6ebe7] pt-6 text-xs leading-5 text-gray-500">
            Esta proposta está sujeita à confirmação de disponibilidade, especificações finais e aprovação do cliente.
          </p>
        </div>
      </article>
    </div>
  );
}
