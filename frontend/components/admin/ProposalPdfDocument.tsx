'use client';

import { useEffect, useState } from 'react';
import type { AdminQuote } from '@/lib/admin-api';
import { fetchBlobWithAuth } from '@/lib/auth';

/** Preview the canonical PDF, not a second HTML interpretation of its layout. */
export function ProposalPdfDocument({ quote }: { quote: AdminQuote }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ quote: AdminQuote; attempt: number; url?: string; error?: boolean }>();

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    fetchBlobWithAuth(`/api/quotes/${encodeURIComponent(quote.reference)}/pdf/`, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setResult({ quote, attempt, url: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ quote, attempt, error: true });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [quote, attempt]);

  const current = result?.quote === quote && result.attempt === attempt ? result : undefined;
  if (current?.error) return <div role="alert" className="p-4 text-sm">
    <p>Não foi possível abrir o documento. Tente novamente.</p>
    <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 rounded-lg border px-3 py-2 font-semibold text-brand-800">Tentar novamente</button>
  </div>;
  if (!current?.url) return <p role="status" className="p-4 text-sm">A preparar o documento…</p>;

  return <section aria-label="Documento completo da proposta">
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs text-slate-600">
      <p>O mesmo documento do PDF, com paginação e layout finais.</p>
      <a href={current.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-800">Abrir PDF noutro separador</a>
    </div>
    <iframe src={current.url} title={`Proposta ${quote.reference} — documento completo`} className="h-[78dvh] min-h-[480px] w-full border-0" />
    <p className="p-3 text-xs text-slate-500">Se o navegador não apresentar o documento, abra o PDF noutro separador.</p>
  </section>;
}
