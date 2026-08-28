'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FilePlus2 } from 'lucide-react';
import { DocumentItemsEditor, newDocumentLine, type EditableDocumentLine } from '@/components/admin/DocumentItemsEditor';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { createManualQuote, getClientOptions, getProducts } from '@/lib/admin-api';
import type { ClientOption, Product } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';

export default function NewQuotePage() {
  const router = useRouter();
  const { loading: authLoading, can } = useAdminAuth();
  const canManage = can('quotes.manage');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('10');
  const [paymentOption, setPaymentOption] = useState<'deposit_50' | 'on_delivery'>('deposit_50');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [lines, setLines] = useState<EditableDocumentLine[]>([newDocumentLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !canManage) return;
    Promise.all([getClientOptions(), getProducts()])
      .then(([clientData, productData]) => {
        setClients(clientData);
        setProducts(productData.filter((product) => product.is_active !== false));
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar dados do formulário')));
  }, [authLoading, canManage]);

  function selectClient(value: string) {
    setClientId(value);
    const client = clients.find((item) => item.id === Number(value));
    if (!client) return;
    setClientName(client.name);
    setClientEmail(client.email);
    setClientPhone(client.phone ?? '');
    setClientCompany(client.company ?? '');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const invalidLine = lines.find(
      (line) =>
        !line.description.trim() ||
        !Number.isInteger(Number(line.quantity)) ||
        Number(line.quantity) < 1 ||
        line.unit_price === '' ||
        Number(line.unit_price) < 0
    );
    if (invalidLine) {
      setError('Preencha a descrição, uma quantidade inteira e o preço de cada item.');
      return;
    }
    if (!clientName.trim() || !clientEmail.trim()) {
      setError('Indique o nome e o e-mail do cliente.');
      return;
    }
    const deliveryDays = Number(estimatedDeliveryDays);
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) {
      setError('Indique um prazo estimado entre 1 e 365 dias úteis.');
      return;
    }
    setSaving(true);
    try {
      const quote = await createManualQuote({
        user_id: clientId ? Number(clientId) : null,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_company: clientCompany.trim(),
        urgency,
        estimated_delivery_days: deliveryDays,
        payment_option: paymentOption,
        notes: notes.trim(),
        internal_notes: internalNotes.trim(),
        items: lines.map((line) => ({
          product_id: line.product_id,
          description: line.description.trim(),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      });
      router.push(`/admin/orcamentos/${quote.reference}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar o orçamento.'));
      setSaving(false);
    }
  }

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">A carregar...</div>;
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-600">
          A sua função pode consultar propostas, mas não criar novas.
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-dark">Novo orçamento</h1>
            <p className="text-sm text-gray-500">Crie uma proposta comercial pronta para aprovação.</p>
          </div>
        </div>
        <Button type="submit" disabled={saving} className="gap-2">
          <FilePlus2 className="h-4 w-4" />
          {saving ? 'A criar...' : 'Criar orçamento'}
        </Button>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-dark">Cliente</h2>
            <p className="text-sm text-gray-500">Escolha um cliente registado ou preencha os dados manualmente.</p>
          </div>
          <div>
            <Label htmlFor="client">Cliente registado</Label>
            <Select id="client" value={clientId} onChange={(event) => selectClient(event.target.value)} className="mt-1">
              <option value="">Cliente não registado</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}{client.company ? ` — ${client.company}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="client-name">Nome *</Label>
              <Input id="client-name" value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="client-email">E-mail *</Label>
              <Input id="client-email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="client-phone">Telefone</Label>
              <Input id="client-phone" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="client-company">Empresa</Label>
              <Input id="client-company" value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <DocumentItemsEditor lines={lines} onChange={setLines} products={products} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-5 p-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="urgency">Prioridade</Label>
            <Select id="urgency" value={urgency} onChange={(event) => setUrgency(event.target.value as 'normal' | 'urgent')} className="mt-1">
              <option value="normal">Normal</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="estimated-delivery">Prazo estimado de entrega (dias úteis) *</Label>
            <Input
              id="estimated-delivery"
              type="number"
              min="1"
              max="365"
              step="1"
              required
              value={estimatedDeliveryDays}
              onChange={(event) => setEstimatedDeliveryDays(event.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">Contado após a adjudicação da proposta.</p>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="payment-option">Condição de pagamento *</Label>
            <Select
              id="payment-option"
              value={paymentOption}
              onChange={(event) => setPaymentOption(event.target.value as 'deposit_50' | 'on_delivery')}
              className="mt-1"
            >
              <option value="deposit_50">50% adiantado + 50% na entrega</option>
              <option value="on_delivery">100% na entrega</option>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="notes">Observações para o cliente</Label>
            <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1" />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="internal-notes">Notas internas</Label>
            <Textarea id="internal-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} className="mt-1" />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
