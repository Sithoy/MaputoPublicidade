'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, Clock, FileText, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import {
  approveArtwork,
  approveQuotePrice,
  getClientOrder,
  requestArtworkChange,
} from '@/lib/client-api';
import type { Order } from '@/lib/api';

const statusFlow = [
  { key: 'received', label: 'Pedido recebido' },
  { key: 'reviewing', label: 'Em análise' },
  { key: 'quoted', label: 'Orçamentado' },
  { key: 'approved', label: 'Aprovado' },
  { key: 'in_production', label: 'Em produção' },
  { key: 'ready', label: 'Pronto para entrega' },
  { key: 'delivered', label: 'Entregue' },
];

export default function ClientOrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!reference) return;
    loadOrder();
  }, [reference]);

  async function loadOrder() {
    setLoading(true);
    setError('');
    try {
      const data = await getClientOrder(reference);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar encomenda');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovePrice() {
    if (!order?.quote_reference) return;
    setActionLoading(true);
    try {
      await approveQuotePrice(order.quote_reference, comment);
      await loadOrder();
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar preço');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveArtwork() {
    if (!order?.quote_reference) return;
    setActionLoading(true);
    try {
      await approveArtwork(order.quote_reference, comment);
      await loadOrder();
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar arte');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestChange() {
    if (!order?.quote_reference || !comment.trim()) return;
    setActionLoading(true);
    try {
      await requestArtworkChange(order.quote_reference, comment);
      await loadOrder();
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pedir alteração');
    } finally {
      setActionLoading(false);
    }
  }

  const currentStep = useMemo(
    () => statusFlow.findIndex((s) => s.key === order?.status),
    [order?.status]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error || 'Encomenda não encontrada.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Referência</p>
          <h1 className="text-2xl font-bold text-dark">{order.reference}</h1>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto">
          {order.status_display || order.status}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-dark">Estado da encomenda</h2>
          <div className="relative flex justify-between">
            {statusFlow.map((step, idx) => {
              const completed = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center text-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      completed
                        ? isCurrent
                          ? 'bg-brand text-white'
                          : 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {completed ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`mt-2 hidden text-xs font-medium sm:block ${
                      completed ? 'text-dark' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Detalhes do pedido</h2>
            <p><span className="font-medium text-dark">Produto:</span> {order.product_name}</p>
            <p><span className="font-medium text-dark">Quantidade:</span> {order.quantity}</p>
            {order.size && <p><span className="font-medium text-dark">Tamanho:</span> {order.size}</p>}
            {order.material && <p><span className="font-medium text-dark">Material:</span> {order.material}</p>}
            {order.colors && <p><span className="font-medium text-dark">Cores:</span> {order.colors}</p>}
            <p>
              <span className="font-medium text-dark">Entrega:</span>{' '}
              {order.delivery_method_display || order.delivery_method}
            </p>
            {order.delivery_address && (
              <p><span className="font-medium text-dark">Morada:</span> {order.delivery_address}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Pagamento</h2>
            <p>
              <span className="font-medium text-dark">Preço final:</span>{' '}
              {order.final_price ? `${order.final_price.toLocaleString()} MZN` : 'Ainda não definido'}
            </p>
            <p>
              <span className="font-medium text-dark">Valor pago:</span>{' '}
              {(order.amount_paid || 0).toLocaleString()} MZN
            </p>
            <p>
              <span className="font-medium text-dark">Em dívida:</span>{' '}
              <span className="font-bold text-brand">
                {(order.amount_due || 0).toLocaleString()} MZN
              </span>
            </p>
            <p>
              <span className="font-medium text-dark">Estado:</span>{' '}
              {order.payment_status_display || order.payment_status}
            </p>
            {order.payment_status !== 'paid' && order.amount_due ? (
              <Button disabled className="w-full">
                Pagar (disponível em breve)
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {order.status === 'quoted' && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Aprovação do preço</h2>
            <p className="text-sm text-gray-600">
              O preço final desta encomenda é de{' '}
              <strong>{order.final_price?.toLocaleString()} MZN</strong>. Aprove para prosseguir.
            </p>
            <Textarea
              placeholder="Comentário opcional"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <Button onClick={handleApprovePrice} disabled={actionLoading} className="gap-2">
              <Check className="h-4 w-4" />
              {actionLoading ? 'A processar...' : 'Aprovar preço'}
            </Button>
          </CardContent>
        </Card>
      )}

      {order.artwork ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Prova de arte</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{order.artwork.status_display || order.artwork.status}</Badge>
              {order.artwork.proof_file && (
                <a
                  href={order.artwork.proof_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  Ver ficheiro
                </a>
              )}
            </div>
            {order.artwork.designer_comment && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Comentário do designer:</span>{' '}
                {order.artwork.designer_comment}
              </p>
            )}

            {order.artwork.status === 'pending' && (
              <>
                <Textarea
                  placeholder="Comentário / pedido de alteração"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button onClick={handleApproveArtwork} disabled={actionLoading} className="gap-2">
                    <Check className="h-4 w-4" />
                    Aprovar arte
                  </Button>
                  <Button
                    onClick={handleRequestChange}
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

            {order.artwork.status === 'changes_requested' && (
              <p className="text-sm text-yellow-700">
                Alterações solicitadas: {order.artwork.requested_changes}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
