'use client';

import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Quote } from '@/lib/api';
import { downloadRequestAttachment } from '@/lib/client-api';
import { AttachmentImageViewer, isImageAttachment } from './AttachmentImageViewer';

export function QuoteRequestEvidence({ quote, scope = 'quotes', title = 'Briefing e referências do cliente' }: { quote: Pick<Quote, 'reference' | 'briefing' | 'request_attachments'>; scope?: 'quotes' | 'production'; title?: string }) {
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const attachments = quote.request_attachments || [];
  const images = attachments.filter((file) => isImageAttachment(file.name));
  if (!quote.briefing?.project_name && !attachments.length) return null;
  async function download(file: typeof attachments[number]) {
    setError(''); setDownloading(file.id);
    try { await downloadRequestAttachment(quote.reference, file.id, file.name, scope); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível descarregar o anexo.'); }
    finally { setDownloading(null); }
  }
  return <section className="space-y-4 rounded-2xl border border-[#dfe7e1] bg-white p-5">
    <h2 className="text-lg font-semibold">{title}</h2>
    {quote.briefing?.project_name ? <div className="space-y-2 text-sm"><p className="font-medium">{quote.briefing.project_name}</p><p className="whitespace-pre-wrap text-gray-600">{quote.briefing.notes}</p>{quote.briefing.deadline ? <p>Data pretendida: {quote.briefing.deadline} · a confirmar pela MP</p> : null}</div> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <ul className="space-y-2">{attachments.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f8faf7] p-3"><span className="break-all text-sm">{file.name} · {Math.ceil(file.size / 1024)} KB{file.library_origin ? <span className="mt-1 block text-xs text-brand-800">Biblioteca · {file.library_origin.name}{file.library_origin.approval?.quote_reference ? ` · Aprovada em ${file.library_origin.approval.quote_reference} v${file.library_origin.approval.version}` : ' · Material do cliente'} · versão preservada neste pedido</span> : null}</span><div className="flex gap-2">{isImageAttachment(file.name) ? <Button type="button" variant="outline" size="sm" onClick={() => setPreviewId(file.id)} aria-label={`Visualizar ${file.name}`}><Eye className="mr-2 h-4 w-4" />Visualizar</Button> : null}<Button type="button" variant="outline" size="sm" disabled={downloading !== null} onClick={() => download(file)}><Download className="mr-2 h-4 w-4" />{downloading === file.id ? 'A descarregar...' : 'Descarregar'}</Button></div></li>)}</ul>
    {previewId !== null && images.some((file) => file.id === previewId) ? <AttachmentImageViewer key={`${quote.reference}:${previewId}`} reference={quote.reference} files={images} initialId={previewId} scope={scope} onClose={() => setPreviewId(null)} /> : null}
  </section>;
}
