'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { get } from '@/lib/api';
import { downloadWithAuth, getToken } from '@/lib/auth';
import type { ProposalDraft } from '@/lib/admin-api';

type Source = { channel: string; text: string; draft: ProposalDraft; files: string[] };

export function ProposalSources({ reference }: { reference: string }) {
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setSource(null);
    setError('');
    get<{ source: Source | null }>(`/api/quotes/${encodeURIComponent(reference)}/source/`, {
      headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal,
    }).then((result) => setSource(result.source)).catch(() => {
      if (!controller.signal.aborted) setError('Não foi possível carregar as fontes originais.');
    });
    return () => controller.abort();
  }, [reference]);

  if (!source && !error) return null;
  return (
    <Card><CardContent className="space-y-3 p-6">
      <h2 className="text-lg font-semibold text-dark">Fontes do pedido · apenas equipa comercial</h2>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {source ? <>
        <p className="text-sm text-gray-500">Origem: {source.channel} · rascunho inicial organizado com IA, não substitui a proposta revista.</p>
        <details><summary className="cursor-pointer text-sm font-medium">Ver mensagem e interpretação original</summary>
          <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">{source.text || 'Pedido recebido em anexos.'}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm">{source.draft.summary}</p>
          <ul className="mt-3 space-y-2 text-sm">{source.draft.items.map((item, index) => <li key={index}>{item.description}: {item.source}</li>)}</ul>
        </details>
        <div className="flex flex-wrap gap-2">{source.files.map((name, index) => <Button key={index} type="button" variant="outline" size="sm" onClick={async () => {
          try { await downloadWithAuth(`/api/quotes/${encodeURIComponent(reference)}/source/?file=${index}`, name); }
          catch { setError('Não foi possível descarregar o anexo.'); }
        }}>{name}</Button>)}</div>
      </> : null}
    </CardContent></Card>
  );
}
