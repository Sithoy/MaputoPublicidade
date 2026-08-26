'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import { DocumentItemsEditor, newDocumentLine, type EditableDocumentLine } from '@/components/admin/DocumentItemsEditor';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { createInvoice, getClientOptions, getOrders } from '@/lib/admin-api';
import type { ClientOption, Order } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatMZN } from '@/lib/utils';

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function initialIssueDate() {
  return dateInputValue(new Date());
}

function initialDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return dateInputValue(date);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { loading: authLoading, can } = useAdminAuth();
  const canManage = can('invoices.manage');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderReference, setOrderReference] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientNuit, setClientNuit] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [issueDate, setIssueDate] = useState(initialIssueDate);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [lines, setLines] = useState<EditableDocumentLine[]>([newDocumentLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !canManage) return;
    Promise.all([getClientOptions(), getOrders()])
      .then(([clientData, orderData]) => {
        setClients(clientData);
        setOrders(orderData.filter((order) => !order.invoice_reference));
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar dados de faturação')));
  }, [authLoading, canManage]);

  function selectClient(value: string) {
    setClientId(value);
    const client = clients.find((item) => item.id === Number(value));
    if (!client) return;
    setClientName(client.name);
    setClientEmail(client.email);
    setClientPhone(client.phone ?? '');
    setClientCompany(client.company ?? '');
    setClientNuit(client.nuit ?? '');
    setBillingAddress(client.address ?? '');
  }

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0
  );
  const taxable = Math.max(subtotal - (Number(discount) || 0), 0);
  const taxAmount = taxable * (Number(taxRate) || 0) / 100;
  const total = taxable + taxAmount;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!orderReference) {
      if (!clientName.trim()) {
        setError('Indique o cliente da fatura.');
        return;
      }
      if (lines.some((line) => !line.description.trim() || Number(line.quantity) <= 0 || line.unit_price === '' || Number(line.unit_price) < 0)) {
        setError('Preencha corretamente todos os itens da fatura.');
        return;
      }
    }
    if (dueDate < issueDate) {
      setError('A data de vencimento não pode anteceder a data de emissão.');
      return;
    }
    setSaving(true);
    try {
      const invoice = await createInvoice({
        order_reference: orderReference || null,
        user_id: !orderReference && clientId ? Number(clientId) : null,
        client_name: !orderReference ? clientName.trim() : undefined,
        client_email: !orderReference ? clientEmail.trim() : undefined,
        client_phone: !orderReference ? clientPhone.trim() : undefined,
        client_company: !orderReference ? clientCompany.trim() : undefined,
        client_nuit: !orderReference ? clientNuit.trim() : undefined,
        billing_address: !orderReference ? billingAddress.trim() : undefined,
        issue_date: issueDate,
        due_date: dueDate,
        discount_amount: Number(discount) || 0,
        tax_rate: Number(taxRate) || 0,
        notes: notes.trim(),
        terms: terms.trim(),
        items: orderReference ? undefined : lines.map((line) => ({
          description: line.description.trim(),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      });
      router.push(`/admin/faturas/${invoice.reference}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar a fatura.'));
      setSaving(false);
    }
  }

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">A carregar...</div>;
  }

  if (!canManage) {
    return (
      <Card><CardContent className="p-8 text-center text-gray-600">A sua função não pode emitir faturas.</CardContent></Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-dark">Nova fatura</h1>
            <p className="text-sm text-gray-500">Emita a partir de uma encomenda ou crie um documento direto.</p>
          </div>
        </div>
        <Button type="submit" disabled={saving} className="gap-2">
          <ReceiptText className="h-4 w-4" />
          {saving ? 'A criar...' : 'Criar rascunho'}
        </Button>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-dark">Origem da fatura</h2>
            <p className="text-sm text-gray-500">Ao escolher uma encomenda, cliente e itens são copiados automaticamente.</p>
          </div>
          <div>
            <Label htmlFor="order">Encomenda</Label>
            <Select id="order" value={orderReference} onChange={(event) => setOrderReference(event.target.value)} className="mt-1">
              <option value="">Fatura direta, sem encomenda</option>
              {orders.map((order) => (
                <option key={order.id} value={order.reference}>
                  {order.reference}{order.client_name ? ` — ${order.client_name}` : ''}{order.final_price ? ` — ${formatMZN(order.final_price)}` : ''}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {!orderReference ? (
        <>
          <Card>
            <CardContent className="space-y-5 p-6">
              <div>
                <h2 className="text-lg font-semibold text-dark">Dados fiscais do cliente</h2>
                <p className="text-sm text-gray-500">Escolha um cliente ou preencha os dados do destinatário.</p>
              </div>
              <div>
                <Label htmlFor="client">Cliente registado</Label>
                <Select id="client" value={clientId} onChange={(event) => selectClient(event.target.value)} className="mt-1">
                  <option value="">Cliente não registado</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}{client.company ? ` — ${client.company}` : ''}</option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="name">Nome *</Label><Input id="name" value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="company">Empresa</Label><Input id="company" value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="phone">Telefone</Label><Input id="phone" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="nuit">NUIT</Label><Input id="nuit" value={clientNuit} onChange={(event) => setClientNuit(event.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="address">Morada de faturação</Label><Input id="address" value={billingAddress} onChange={(event) => setBillingAddress(event.target.value)} className="mt-1" /></div>
              </div>
            </CardContent>
          </Card>
          <Card><CardContent className="p-6"><DocumentItemsEditor lines={lines} onChange={setLines} /></CardContent></Card>
        </>
      ) : null}

      <Card>
        <CardContent className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor="issue-date">Data de emissão</Label><Input id="issue-date" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="due-date">Vencimento</Label><Input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="discount">Desconto (MZN)</Label><Input id="discount" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="tax">IVA (%)</Label><Input id="tax" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} className="mt-1" /></div>
          {!orderReference ? (
            <div className="rounded-xl bg-brand-50 p-4 sm:col-span-2 lg:col-span-4">
              <div className="ml-auto max-w-sm space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><strong>{formatMZN(subtotal)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-600">Desconto</span><strong>- {formatMZN(Number(discount) || 0)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-600">IVA</span><strong>{formatMZN(taxAmount)}</strong></div>
                <div className="flex justify-between border-t border-brand-200 pt-2 text-base"><span>Total</span><strong>{formatMZN(total)}</strong></div>
              </div>
            </div>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-4"><Label htmlFor="notes">Observações</Label><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1" /></div>
          <div className="sm:col-span-2 lg:col-span-4"><Label htmlFor="terms">Condições de pagamento</Label><Textarea id="terms" value={terms} onChange={(event) => setTerms(event.target.value)} rows={3} placeholder="Ex.: Pagamento por transferência bancária no prazo indicado." className="mt-1" /></div>
        </CardContent>
      </Card>
    </form>
  );
}
