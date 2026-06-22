'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { getOrder, updateOrderPayment, updateOrderStatus } from '@/lib/admin-api';
import type { Order } from '@/lib/api';

const statuses = [
  { value: 'received', label: 'Pedido recebido' },
  { value: 'reviewing', label: 'Em análise' },
  { value: 'quoted', label: 'Orçamentado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'in_production', label: 'Em produção' },
  { value: 'ready', label: 'Pronto para entrega' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

const paymentStatuses = [
  { value: 'pending', label: 'Pendente' },
  { value: 'partial', label: 'Parcialmente pago' },
  { value: 'paid', label: 'Pago' },
];

export default function AdminOrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (authLoading || !reference) return;
    loadOrder();
  }, [authLoading, reference]);

  async function loadOrder() {
    setLoading(true);
    setError('');
    try {
      const data = await getOrder(reference);
      setOrder(data);
      setStatus(data.status);
      setPaymentStatus(data.payment_status);
      setAmountPaid(data.amount_paid?.toString() || '');
      setInternalNotes(data.internal_notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar encomenda');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate() {
    if (!reference) return;
    setSaving(true);
    try {
      await updateOrderStatus(reference, status);
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar estado');
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentUpdate() {
    if (!reference) return;
    setSaving(true);
    try {
      await updateOrderPayment(reference, {
        payment_status: paymentStatus,
        amount_paid: amountPaid ? Number(amountPaid) : null,
      });
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar pagamento');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || 'Encomenda não encontrada.'}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/encomendas" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Voltar às encomendas
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Referência</p>
          <h1 className="text-2xl font-bold text-dark">{order.reference}</h1>
        </div>
        <Badge variant="outline">{order.status_display || order.status}</Badge>
      </div>

      {order.quote_reference && (
        <p className="text-sm text-gray-600">
          Originado do orçamento{' '}
          <Link href={`/admin/orcamentos/${order.quote_reference}`} className="text-brand hover:underline">
            {order.quote_reference}
          </Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Dados do cliente</h2>
            <p><span className="font-medium text-dark">Email:</span> {order.user_email}</p>
            <p><span className="font-medium text-dark">Nome:</span> {order.user_name}</p>
            {order.profile?.company && <p><span className="font-medium text-dark">Empresa:</span> {order.profile.company}</p>}
            {order.profile?.phone && <p><span className="font-medium text-dark">Telefone:</span> {order.profile.phone}</p>}
            {order.profile?.nuit && <p><span className="font-medium text-dark">NUIT:</span> {order.profile.nuit}</p>}
            {order.delivery_address && <p><span className="font-medium text-dark">Morada de entrega:</span> {order.delivery_address}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-dark">Detalhes da encomenda</h2>
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
            <div className="pt-2 text-sm">
              <p><span className="font-medium text-dark">Preço final:</span> {order.final_price ? `${order.final_price.toLocaleString()} MZN` : '—'}</p>
              <p><span className="font-medium text-dark">Em dívida:</span> {order.amount_due ? `${order.amount_due.toLocaleString()} MZN` : '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-dark">Actualizar estado</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="status">Estado da encomenda</Label>
              <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1">
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <Button onClick={handleStatusUpdate} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            Actualizar estado
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-dark">Pagamento</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="payment_status">Estado de pagamento</Label>
              <Select id="payment_status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="mt-1">
                {paymentStatuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="amount_paid">Valor pago (MZN)</Label>
              <Input id="amount_paid" type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1" />
            </div>
          </div>
          <Button onClick={handlePaymentUpdate} disabled={saving} variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Actualizar pagamento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
