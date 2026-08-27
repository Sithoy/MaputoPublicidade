'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Download, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { WorkflowJourney } from '@/components/workflow/WorkflowJourney';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import {
  approveArtwork,
  approveQuotePrice,
  downloadClientQuotePdf,
  getClientQuote,
  requestArtworkChange,
} from '@/lib/client-api';
import type { OrderStatus, Quote } from '@/lib/api';
import { clientOrderStatusLabels } from '@/lib/status';
import { formatMZN } from '@/lib/utils';

export default function ClientQuoteDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadQuote = useCallback(async () => {
    if (!reference) return;
    setLoading(true);
    setError('');
    try {
      setQuote(await getClientQuote(reference));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  async function runAction(action: () => Promise<unknown>) {
    setActionLoading(true);
    setError('');
    try {
      await action();
      await loadQuote();
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a acção.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error || 'Orçamento não encontrado.'}
      </div>
    );
  }

  const awaitingPriceApproval = quote.status === 'quoted';
  const artworkPending = quote.artwork?.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Proposta</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-dark">
            Orçamento {quote.reference}
          </h1>
          <p className="mt-1 text-sm text-[#718078]">
            Reveja a proposta, aprove o valor e acompanhe a arte até à produção.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline">
            {quote.status_display || clientOrderStatusLabels[quote.status] || quote.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              downloadClientQuotePdf(quote.reference).catch(() =>
                setError('Não foi possível descarregar a proposta.')
              )
            }
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card className="rounded-3xl border-[#dfe7e1] shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
        <CardContent className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
            Percurso do trabalho
          </p>
          <WorkflowJourney status={quote.status as OrderStatus} compact className="mt-6" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-dark">Itens do pedido</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-gray-500">
                <tr>
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 font-medium">Qtd</th>
                  <th className="pb-2 font-medium">Tamanho</th>
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 font-medium">Cores</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-dark">{item.description}</td>
                    <td className="py-3">{item.quantity}</td>
                    <td className="py-3">{item.size || '—'}</td>
                    <td className="py-3">{item.material || '—'}</td>
                    <td className="py-3">{item.colors || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-1 pt-3 text-sm">
            {quote.estimated_price ? (
              <p>
                <span className="font-medium text-dark">Preço estimado:</span>{' '}
                {formatMZN(quote.estimated_price)}
              </p>
            ) : null}
            <p>
              <span className="font-medium text-dark">Preço final:</span>{' '}
              {quote.final_price ? (
                <span className="font-bold text-brand">{formatMZN(quote.final_price)}</span>
              ) : (
                'Ainda não definido'
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {awaitingPriceApproval && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Aprovação da proposta</h2>
            <p className="text-sm text-gray-600">
              {quote.final_price ? (
                <>
                  O valor final desta proposta é de{' '}
                  <strong>{formatMZN(quote.final_price)}</strong>. Aprove para avançarmos
                  para a produção, ou fale connosco se tiver dúvidas.
                </>
              ) : (
                'A equipa ainda está a finalizar o valor desta proposta.'
              )}
            </p>
            <Textarea
              placeholder="Comentário opcional"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <Button
              onClick={() => runAction(() => approveQuotePrice(quote.reference, comment))}
              disabled={actionLoading || !quote.final_price}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {actionLoading ? 'A processar...' : 'Aprovar proposta'}
            </Button>
          </CardContent>
        </Card>
      )}

      {quote.price_approved_at && (
        <Card className="border-brand-200 bg-brand-50/40">
          <CardContent className="flex items-start gap-3 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
            <div className="text-sm">
              <p className="font-semibold text-dark">
                Proposta aprovada
                {quote.price_approved_by_name ? ` por ${quote.price_approved_by_name}` : ''}
              </p>
              <p className="mt-0.5 text-[#68776f]">
                {new Date(quote.price_approved_at).toLocaleString('pt-MZ')}
                {quote.price_approval_comment ? ` · “${quote.price_approval_comment}”` : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {quote.artwork ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Prova de arte</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{quote.artwork.status_display || quote.artwork.status}</Badge>
              {quote.artwork.proof_file && (
                <a
                  href={quote.artwork.proof_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  Ver ficheiro
                </a>
              )}
            </div>
            {quote.artwork.designer_comment && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Comentário do designer:</span>{' '}
                {quote.artwork.designer_comment}
              </p>
            )}

            {artworkPending && (
              <>
                <Textarea
                  placeholder="Comentário / pedido de alteração"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => runAction(() => approveArtwork(quote.reference, comment))}
                    disabled={actionLoading}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Aprovar arte
                  </Button>
                  <Button
                    onClick={() => runAction(() => requestArtworkChange(quote.reference, comment))}
                    disabled={actionLoading || !comment.trim()}
                    variant="outline"
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Pedir alteração
                  </Button>
                </div>
              </>
            )}

            {quote.artwork.status === 'changes_requested' && (
              <p className="text-sm text-yellow-700">
                Alterações solicitadas: {quote.artwork.requested_changes}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-dark">Histórico</h2>
          <ActivityTimeline events={quote.activity ?? []} />
        </CardContent>
      </Card>

      {quote.order_reference && (        <Card className="border-brand-200">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark">Encomenda criada</h2>
              <p className="mt-1 text-sm text-[#68776f]">
                Esta proposta foi convertida na encomenda {quote.order_reference}.
              </p>
            </div>
            <Link
              href={`/area-cliente/encomendas/${quote.order_reference}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Acompanhar encomenda
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
