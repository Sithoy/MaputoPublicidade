'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Factory,
  History,
  Save,
  Truck,
  WalletCards,
} from 'lucide-react';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  createOrderPayment,
  getOrder,
  getOrderPayments,
  getUsers,
  updateOrderDelivery,
  updateOrderNotes,
  updateOrderPayment,
  updateOrderStatus,
} from '@/lib/admin-api';
import type { Order, Payment, User } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  allowedNextStatuses,
  orderStatusLabels,
  orderStatusTransitions,
} from '@/lib/status';
import { cn, formatMZN } from '@/lib/utils';

type DetailTab = 'overview' | 'production' | 'delivery' | 'finance' | 'activity';

const tabs: Array<{
  value: DetailTab;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { value: 'overview', label: 'Resumo', icon: ClipboardList },
  { value: 'production', label: 'Produção', icon: Factory },
  { value: 'delivery', label: 'Entrega', icon: Truck },
  { value: 'finance', label: 'Finanças', icon: WalletCards },
  { value: 'activity', label: 'Histórico', icon: History },
];

const statuses = Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }));

const paymentStatuses = [
  { value: 'pending', label: 'Pendente' },
  { value: 'partial', label: 'Parcialmente pago' },
  { value: 'paid', label: 'Pago' },
];

function toLocalInputValue(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function orderTitle(order: Order) {
  if (order.items.length === 0) return 'Trabalho sem descrição';
  if (order.items.length === 1) return order.items[0].description;
  return `${order.items[0].description} +${order.items.length - 1}`;
}

export default function AdminOrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const { loading: authLoading, can } = useAdminAuth();
  const canManageOrderStatus = can('orders.manage_status');
  const canCancelOrders = can('orders.manage');
  const canManageDelivery = can('orders.manage_delivery');
  const canManageNotes = can('orders.manage_notes');
  const canManagePayments = can('payments.manage');
  const canViewPayments = can('payments.view') || canManagePayments;

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);

  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('cash');
  const [newReference, setNewReference] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [installationRequired, setInstallationRequired] = useState(false);
  const [responsibleId, setResponsibleId] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);

  const loadOrder = useCallback(async () => {
    if (!reference) return;
    setLoading(true);
    setError('');
    try {
      const [data, paymentList] = await Promise.all([
        getOrder(reference),
        canViewPayments ? getOrderPayments(reference) : Promise.resolve([]),
      ]);
      setOrder(data);
      setStatus(data.status);
      setPaymentStatus(data.payment_status);
      setAmountPaid(data.amount_paid?.toString() || '');
      setInternalNotes(data.internal_notes || '');
      setDeliveryMethod(data.delivery_method || 'pickup');
      setDeliveryAddress(data.delivery_address || '');
      setScheduledDate(toLocalInputValue(data.scheduled_date));
      setInstallationRequired(Boolean(data.installation_required));
      setResponsibleId(data.delivery_responsible ? String(data.delivery_responsible) : '');
      setPayments(paymentList);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar encomenda'));
    } finally {
      setLoading(false);
    }
  }, [canViewPayments, reference]);

  useEffect(() => {
    if (authLoading || !reference) return;
    void loadOrder();
  }, [authLoading, loadOrder, reference]);

  useEffect(() => {
    if (authLoading || !canManageDelivery) return;
    void getUsers('?page_size=100')
      .then((data) => setStaffUsers(data.results.filter((user) => user.is_staff)))
      .catch(() => setStaffUsers([]));
  }, [authLoading, canManageDelivery]);

  function beginSave() {
    setSaving(true);
    setError('');
    setNotice('');
  }

  async function handleDeliverySave() {
    if (!reference) return;
    beginSave();
    try {
      await updateOrderDelivery(reference, {
        delivery_method: deliveryMethod as 'pickup' | 'delivery',
        delivery_address: deliveryAddress,
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        installation_required: installationRequired,
        delivery_responsible_id: responsibleId ? Number(responsibleId) : null,
        completion_photo: completionPhoto,
      });
      setCompletionPhoto(null);
      setNotice('Dados de entrega actualizados.');
      await loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao guardar entrega'));
    } finally {
      setSaving(false);
    }
  }

  async function handleNotesSave() {
    if (!reference) return;
    beginSave();
    try {
      await updateOrderNotes(reference, internalNotes);
      setNotice('Notas internas guardadas.');
      await loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao guardar notas internas'));
    } finally {
      setSaving(false);
    }
  }

  async function performStatusUpdate() {
    if (!reference) return;
    beginSave();
    try {
      await updateOrderStatus(reference, status);
      setNotice('Estado do trabalho actualizado.');
      await loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao actualizar estado'));
    } finally {
      setSaving(false);
    }
  }

  function handleStatusUpdate() {
    if (status === 'cancelled' && order?.status !== 'cancelled') {
      setConfirmCancel(true);
      return;
    }
    void performStatusUpdate();
  }

  async function handlePaymentUpdate() {
    if (!reference) return;
    beginSave();
    try {
      await updateOrderPayment(reference, {
        payment_status: paymentStatus,
        amount_paid: amountPaid ? Number(amountPaid) : null,
      });
      setNotice('Estado financeiro actualizado.');
      await loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao actualizar pagamento'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!reference || !newAmount) return;
    beginSave();
    try {
      await createOrderPayment(reference, {
        amount: Number(newAmount),
        method: newMethod,
        reference_code: newReference,
        notes: newNotes,
        status: 'completed',
      });
      setNewAmount('');
      setNewReference('');
      setNewNotes('');
      setNotice('Pagamento registado.');
      await loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao registar pagamento'));
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

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error || 'Encomenda não encontrada.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/encomendas"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar a produção e entregas
      </Link>

      <Card className="border-0 bg-dark text-white shadow-lg">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white/60">{order.reference}</span>
                <StatusBadge
                  status={order.status}
                  label={order.status_display || orderStatusLabels[order.status]}
                />
              </div>
              <h1 className="mt-3 max-w-2xl text-2xl font-bold sm:text-3xl">
                {orderTitle(order)}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                {order.client_name || order.profile?.company || order.user_name || order.user_email}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-white/50">Entrega</p>
                <p className="mt-1 text-sm font-semibold">
                  {order.scheduled_date
                    ? new Date(order.scheduled_date).toLocaleDateString('pt-MZ')
                    : 'Por agendar'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-white/50">Responsável</p>
                <p className="mt-1 max-w-[150px] truncate text-sm font-semibold">
                  {order.delivery_responsible_name || 'Por atribuir'}
                </p>
              </div>
              <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-1">
                <p className="text-xs text-white/50">Pagamento</p>
                <p className="mt-1 text-sm font-semibold">
                  {order.payment_status_display || order.payment_status}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.quote_reference ? (
        <p className="text-sm text-gray-600">
          Originado do orçamento{' '}
          <Link
            href={`/admin/orcamentos/${order.quote_reference}`}
            className="font-semibold text-brand hover:underline"
          >
            {order.quote_reference}
          </Link>
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      ) : null}

      <div
        className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-px"
        role="tablist"
        aria-label="Detalhes do trabalho"
      >
        {tabs
          .filter((tab) => tab.value !== 'finance' || canViewPayments)
          .map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
                  activeTab === tab.value
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-dark'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.5fr]">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</p>
                <h2 className="mt-1 text-lg font-semibold text-dark">
                  {order.profile?.company || order.client_name || order.user_name || 'Cliente'}
                </h2>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-400">Email</dt>
                  <dd className="mt-0.5 font-medium text-gray-700">{order.user_email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Telefone</dt>
                  <dd className="mt-0.5 font-medium text-gray-700">{order.profile?.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">NUIT</dt>
                  <dd className="mt-0.5 font-medium text-gray-700">{order.profile?.nuit || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Morada</dt>
                  <dd className="mt-0.5 font-medium text-gray-700">
                    {order.delivery_address || order.profile?.address || '—'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Especificações
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-dark">Itens do trabalho</h2>
                </div>
                <Badge variant="outline">{order.items.length} item(ns)</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-gray-500">
                    <tr>
                      <th className="pb-2 font-medium">Descrição</th>
                      <th className="pb-2 font-medium">Qtd.</th>
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
              <div className="mt-4 flex flex-wrap justify-end gap-x-8 gap-y-2 border-t pt-4 text-sm">
                <p>
                  <span className="text-gray-400">Total: </span>
                  <strong className="text-dark">
                    {order.final_price ? formatMZN(order.final_price) : '—'}
                  </strong>
                </p>
                {canViewPayments ? (
                  <p>
                    <span className="text-gray-400">Saldo: </span>
                    <strong className="text-dark">
                      {order.amount_due !== undefined ? formatMZN(order.amount_due) : '—'}
                    </strong>
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'production' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Fluxo de produção
                </p>
                <h2 className="mt-1 text-lg font-semibold text-dark">Estado do trabalho</h2>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-400">Estado actual</p>
                <div className="mt-2">
                  <StatusBadge
                    status={order.status}
                    label={order.status_display || orderStatusLabels[order.status]}
                  />
                </div>
              </div>
              {canManageOrderStatus ? (
                <>
                  <div>
                    <Label htmlFor="status">Mover para</Label>
                    <Select
                      id="status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="mt-1"
                    >
                      {statuses
                        .filter((option) =>
                          allowedNextStatuses(order.status, orderStatusTransitions).includes(
                            option.value
                          )
                        )
                        .filter((option) => option.value !== 'cancelled' || canCancelOrders)
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <Button onClick={handleStatusUpdate} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    Actualizar estado
                  </Button>
                </>
              ) : (
                <p className="text-sm text-gray-500">Apenas leitura para a sua função.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Comunicação interna
                </p>
                <h2 className="mt-1 text-lg font-semibold text-dark">Notas para a equipa</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Visíveis apenas à equipa autorizada; não aparecem no BrandDesk do cliente.
                </p>
              </div>
              {canManageNotes ? (
                <>
                  <Textarea
                    id="internal_notes"
                    aria-label="Notas internas"
                    rows={8}
                    value={internalNotes}
                    onChange={(event) => setInternalNotes(event.target.value)}
                    placeholder="Registe acabamentos, dependências, instruções de montagem ou alertas..."
                  />
                  <Button
                    onClick={handleNotesSave}
                    disabled={saving}
                    variant="outline"
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar notas
                  </Button>
                </>
              ) : (
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                  {internalNotes || 'Sem notas internas.'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'delivery' ? (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Conclusão do trabalho
                </p>
                <h2 className="text-lg font-semibold text-dark">Planeamento da entrega</h2>
              </div>
            </div>
            {order.client_confirmed_at ? (
              <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
                Entrega confirmada pelo cliente em{' '}
                {new Date(order.client_confirmed_at).toLocaleString('pt-MZ')}.
              </p>
            ) : null}
            {canManageDelivery ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="delivery_method">Método</Label>
                    <Select
                      id="delivery_method"
                      value={deliveryMethod}
                      onChange={(event) => setDeliveryMethod(event.target.value)}
                      className="mt-1"
                    >
                      <option value="pickup">Levantamento</option>
                      <option value="delivery">Entrega</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="scheduled_date">Data agendada</Label>
                    <Input
                      id="scheduled_date"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(event) => setScheduledDate(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="installation_required">Instalação necessária</Label>
                    <Select
                      id="installation_required"
                      value={installationRequired ? 'yes' : 'no'}
                      onChange={(event) => setInstallationRequired(event.target.value === 'yes')}
                      className="mt-1"
                    >
                      <option value="no">Não</option>
                      <option value="yes">Sim</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="delivery_responsible">Responsável</Label>
                    <Select
                      id="delivery_responsible"
                      value={responsibleId}
                      onChange={(event) => setResponsibleId(event.target.value)}
                      className="mt-1"
                    >
                      <option value="">Por atribuir</option>
                      {staffUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="delivery_address">Morada de entrega</Label>
                  <Textarea
                    id="delivery_address"
                    rows={2}
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="completion_photo">Prova de conclusão</Label>
                  <Input
                    id="completion_photo"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setCompletionPhoto(event.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {order.completion_photo ? (
                    <a
                      href={order.completion_photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-brand hover:underline"
                    >
                      Ver fotografia actual
                    </a>
                  ) : null}
                </div>
                <Button
                  onClick={handleDeliverySave}
                  disabled={saving}
                  variant="outline"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar entrega
                </Button>
              </>
            ) : (
              <dl className="grid gap-4 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-400">Método</dt>
                  <dd className="mt-1 font-medium text-gray-700">
                    {order.delivery_method_display || 'Levantamento'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Agendamento</dt>
                  <dd className="mt-1 font-medium text-gray-700">
                    {order.scheduled_date
                      ? new Date(order.scheduled_date).toLocaleString('pt-MZ')
                      : 'Por agendar'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Responsável</dt>
                  <dd className="mt-1 font-medium text-gray-700">
                    {order.delivery_responsible_name || 'Por atribuir'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Instalação</dt>
                  <dd className="mt-1 font-medium text-gray-700">
                    {order.installation_required ? 'Necessária' : 'Não necessária'}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'finance' && canViewPayments ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Valor do trabalho', value: order.final_price },
              { label: 'Total pago', value: order.amount_paid },
              { label: 'Saldo', value: order.amount_due },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="mt-2 text-xl font-bold text-dark">
                    {item.value !== undefined ? formatMZN(item.value) : '—'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {canManagePayments ? (
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="text-lg font-semibold text-dark">Actualizar situação financeira</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="payment_status">Estado de pagamento</Label>
                    <Select
                      id="payment_status"
                      value={paymentStatus}
                      onChange={(event) => setPaymentStatus(event.target.value)}
                      className="mt-1"
                    >
                      {paymentStatuses.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount_paid">Valor pago (MZN)</Label>
                    <Input
                      id="amount_paid"
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(event) => setAmountPaid(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  onClick={handlePaymentUpdate}
                  disabled={saving}
                  variant="outline"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Actualizar pagamento
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-semibold text-dark">Registo de pagamentos</h2>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-500">Ainda não há pagamentos registados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-gray-500">
                      <tr>
                        <th className="pb-2 font-medium">Data</th>
                        <th className="pb-2 font-medium">Método</th>
                        <th className="pb-2 font-medium">Referência</th>
                        <th className="pb-2 font-medium">Valor</th>
                        <th className="pb-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-3">
                            {new Date(payment.created_at).toLocaleDateString('pt-MZ')}
                          </td>
                          <td className="py-3">{payment.method_display || payment.method}</td>
                          <td className="py-3">{payment.reference_code || '—'}</td>
                          <td className="py-3 font-medium text-dark">
                            {formatMZN(payment.amount)}
                          </td>
                          <td className="py-3">{payment.status_display || payment.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canManagePayments ? (
                <form onSubmit={handleAddPayment} className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold text-dark">Registar novo pagamento</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="pay_amount">Valor (MZN) *</Label>
                      <Input
                        id="pay_amount"
                        type="number"
                        step="0.01"
                        value={newAmount}
                        onChange={(event) => setNewAmount(event.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pay_method">Método</Label>
                      <Select
                        id="pay_method"
                        value={newMethod}
                        onChange={(event) => setNewMethod(event.target.value)}
                        className="mt-1"
                      >
                        <option value="cash">Dinheiro</option>
                        <option value="bank_transfer">Transferência bancária</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="emola">E-Mola</option>
                        <option value="other">Outro</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pay_ref">Referência</Label>
                      <Input
                        id="pay_ref"
                        value={newReference}
                        onChange={(event) => setNewReference(event.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="pay_notes">Observações</Label>
                    <Textarea
                      id="pay_notes"
                      value={newNotes}
                      onChange={(event) => setNewNotes(event.target.value)}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={saving || !newAmount}
                    variant="outline"
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Registar pagamento
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'activity' ? (
        <Card>
          <CardContent className="p-5">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Rastreabilidade
              </p>
              <h2 className="mt-1 text-lg font-semibold text-dark">Histórico do trabalho</h2>
            </div>
            <ActivityTimeline events={order.activity ?? []} />
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar encomenda"
        message={`Tem a certeza que pretende cancelar a encomenda ${order.reference}? Esta acção interrompe o trabalho em curso.`}
        confirmText="Cancelar encomenda"
        destructive
        onConfirm={() => {
          setConfirmCancel(false);
          void performStatusUpdate();
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
