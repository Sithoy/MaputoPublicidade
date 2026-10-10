'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProposalDocument } from '@/components/admin/ProposalDocument';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getQuote, type AdminQuote } from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api-errors';

export default function PrintableQuotePage() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [quote, setQuote] = useState<AdminQuote | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (authLoading || !reference) return;
    let active = true;
    setQuote(null); setError('');
    getQuote(reference).then((data) => { if (active) setQuote(data); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err, 'Erro ao carregar proposta')); });
    return () => { active = false; };
  }, [authLoading, reference]);
  if (authLoading || !quote) return <div className="flex h-64 items-center justify-center text-gray-500">{error || 'A carregar...'}</div>;
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="print-hidden flex items-center justify-between gap-3">
      <Button variant="outline" size="sm" onClick={() => router.push(`/admin/orcamentos/${quote.reference}`)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir / Guardar PDF</Button>
    </div>
    <ProposalDocument quote={quote} />
  </div>;
}
