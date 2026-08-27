'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, MessageSquare, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { WorkflowJourney } from '@/components/workflow/WorkflowJourney';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import {
  approveArtwork,
  getClientOrder,
  getOrderPayments,
  initiatePayment,
  requestArtworkChange,
} from '@/lib/client-api';
import type { Order, Payment } from '@/lib/api';
import { getClientNextAction } from '@/lib/workflow';
import { formatMZN } from '@/lib/utils';

export default function ClientOrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payMethod, setPayMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [payPhone, setPayPhone] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!reference) return;
    setLoading(true);
    setError('');
    try {
      const [data, paymentList] = await Promise.all([
        getClientOrder(reference),
        getOrderPayments(reference),
      ]);
      setOrder(data);
      setPayments(paymentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar encomenda');
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    if (!reference) return;
    loadOrder();
  }, [reference, loadOrder]);

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

  async function handlePay() {
    if (!order) return;
    if (!payPhone.trim()) {
      setError('Introduza o número de telemóvel.');
      return;
    }
    setPayLoading(true);
    setError('');
    try {
      await initiatePayment({
        order_reference: order.reference,
        method: payMethod,
        phone_number: payPhone,
        amount: payAmount ? Number(payAmount) : undefined,
      });
      await loadOrder();
      setPayAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar pagamento');
    } finally {
      setPayLoading(false);
    }
  }

  const nextAction = useMemo(() => (order ? getClientNextAction(order) : null), [order]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Projeto de marca</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-dark">
            Projeto {order.reference}
          </h1>
          <p className="mt-1 text-sm text-[#718078]">
            Consulte o progresso, aprove decisões e mantenha todos os detalhes num só lugar.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline">{order.status_display || order.status}</Badge>
          <Link
            href={`/area-cliente/novo-pedido?repetir=${encodeURIComponent(order.reference)}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7e1da] bg-white px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Repetir
          </Link>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.65fr]">
        <Card className="rounded-3xl border-[#dfe7e1] shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
          <CardContent className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
              Percurso do trabalho
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">
              Da recepção à entrega
            </h2>
            <WorkflowJourney status={order.status} compact className="mt-6" />
          </CardContent>
        </Card>

        <div className="rounded-3xl border border-[#e3dac8] bg-[#f4f0e8] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d7040]">
            Próximo passo
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-dark">
            {nextAction?.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#706858]">{nextAction?.description}</p>
          <span
            className={`mt-5 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
              nextAction?.actionRequired
                ? 'bg-amber-100 text-amber-800'
                : 'bg-white/80 text-brand-800'
            }`}
          >
            {nextAction?.actionRequired ? 'Acção necessária' : 'Acompanhamento da equipa'}
          </span>
        </div>
      </section>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-dark">Materiais do projeto</h2>
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
                {order.items.map((item) => (
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-semibold text-dark">Pagamento</h2>
          <p>
            <span className="font-medium text-dark">Preço final:</span>{' '}
            {order.final_price ? formatMZN(order.final_price) : 'Ainda não definido'}
          </p>
          <p>
            <span className="font-medium text-dark">Valor pago:</span>{' '}
            {formatMZN(order.amount_paid || 0)}
          </p>
          <p>
            <span className="font-medium text-dark">Em dívida:</span>{' '}
            <span className="font-bold text-brand">
              {formatMZN(order.amount_due || 0)}
            </span>
          </p>
          <p>
            <span className="font-medium text-dark">Estado:</span>{' '}
            {order.payment_status_display || order.payment_status}
          </p>

          {payments.length > 0 && (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-gray-500">
                  <tr>
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Método</th>
                    <th className="pb-2 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">{new Date(payment.created_at).toLocaleDateString('pt-MZ')}</td>
                      <td className="py-2">{payment.method_display || payment.method}</td>
                      <td className="py-2 font-medium text-dark">{formatMZN(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {order.payment_status !== 'paid' && order.amount_due ? (
            <div className="space-y-3 rounded-lg border p-3">
              <h3 className="text-sm font-medium text-dark">Pagar com M-Pesa / E-Mola</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="pay-method" className="text-xs">Método</Label>
                  <Select
                    id="pay-method"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as 'mpesa' | 'emola')}
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="emola">E-Mola</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-phone" className="text-xs">Telemóvel</Label>
                  <Input
                    id="pay-phone"
                    placeholder="25884..."
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="pay-amount" className="text-xs">Valor (MZN)</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    placeholder={`Em dívida: ${formatMZN(order.amount_due || 0)}`}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handlePay} disabled={payLoading} className="w-full">
                {payLoading ? 'A processar...' : 'Pagar agora'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {order.quote_reference && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark">Proposta original</h2>
              <p className="mt-1 text-sm text-[#68776f]">
                Esta encomenda começou no orçamento {order.quote_reference}.
              </p>
            </div>
            <Link
              href={`/area-cliente/orcamentos/${order.quote_reference}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#dfe7e1] px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Ver orçamento
              <ArrowRight className="h-4 w-4" />
            </Link>
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

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-dark">Histórico</h2>
          <ActivityTimeline events={order.activity ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
