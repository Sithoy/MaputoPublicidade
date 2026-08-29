'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  Mail,
  MessageCircle,
  Phone,
  Store,
  UserRoundPlus,
} from 'lucide-react';
import {
  DocumentItemsEditor,
  newDocumentLine,
  type EditableDocumentLine,
} from '@/components/admin/DocumentItemsEditor';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  createReceptionIntake,
  getClientOptions,
  getProducts,
  type ReceptionIntakeInput,
} from '@/lib/admin-api';
import type { ClientOption, Product } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

type ContactSource = ReceptionIntakeInput['contact_source'];
type IntakeOutcome = ReceptionIntakeInput['outcome'];

const contactSources: Array<{
  value: ContactSource;
  label: string;
  helper: string;
  icon: typeof Store;
}> = [
  { value: 'walk_in', label: 'Presencial', helper: 'Cliente no balcão', icon: Store },
  { value: 'phone', label: 'Telefone', helper: 'Chamada recebida', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', helper: 'Conversa digital', icon: MessageCircle },
  { value: 'email', label: 'E-mail', helper: 'Pedido por correio', icon: Mail },
];

export default function NewReceptionIntakePage() {
  const router = useRouter();
  const { loading: authLoading, can } = useAdminAuth();
  const canCreateIntake = can('intake.create');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contactSource, setContactSource] = useState<ContactSource>('walk_in');
  const [outcome, setOutcome] = useState<IntakeOutcome>('quote');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('10');
  const [paymentOption, setPaymentOption] = useState<'deposit_50' | 'on_delivery'>('deposit_50');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [lines, setLines] = useState<EditableDocumentLine[]>([newDocumentLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !canCreateIntake) return;
    Promise.all([getClientOptions(), getProducts()])
      .then(([clientData, productData]) => {
        setClients(clientData);
        setProducts(productData.filter((product) => product.is_active !== false));
      })
      .catch((err) =>
        setError(getApiErrorMessage(err, 'Erro ao carregar os dados do atendimento.'))
      );
  }, [authLoading, canCreateIntake]);

  function selectClient(value: string) {
    setClientId(value);
    const client = clients.find((item) => item.id === Number(value));
    if (!client) return;
    setClientName(client.name);
    setClientEmail(client.email);
    setClientPhone(client.phone ?? '');
    setClientCompany(client.company ?? '');
    setDeliveryAddress(client.address ?? '');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!clientName.trim()) {
      setError('Indique o nome do cliente.');
      return;
    }
    if (!clientPhone.trim() && !clientEmail.trim()) {
      setError('Indique pelo menos um telefone ou e-mail para contacto.');
      return;
    }

    const invalidLine = lines.find(
      (line) =>
        !line.description.trim() ||
        !Number.isInteger(Number(line.quantity)) ||
        Number(line.quantity) < 1
    );
    if (invalidLine) {
      setError('Preencha a descrição e uma quantidade inteira para cada item.');
      return;
    }
    if (
      outcome === 'confirmed_order' &&
      lines.some((line) => line.unit_price === '' || Number(line.unit_price) < 0)
    ) {
      setError('Uma encomenda confirmada precisa do preço de todos os itens.');
      return;
    }

    const deliveryDays = estimatedDeliveryDays ? Number(estimatedDeliveryDays) : null;
    if (
      deliveryDays !== null &&
      (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365)
    ) {
      setError('O prazo deve estar entre 1 e 365 dias úteis.');
      return;
    }
    if (outcome === 'confirmed_order' && deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      setError('Indique a morada para a entrega.');
      return;
    }

    setSaving(true);
    try {
      const result = await createReceptionIntake({
        user_id: clientId ? Number(clientId) : null,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_company: clientCompany.trim(),
        contact_source: contactSource,
        outcome,
        urgency,
        estimated_delivery_days: deliveryDays,
        payment_option: paymentOption,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress.trim(),
        notes: notes.trim(),
        internal_notes: internalNotes.trim(),
        items: lines.map((line) => ({
          product_id: line.product_id,
          description: line.description.trim(),
          quantity: Number(line.quantity),
          unit_price: line.unit_price === '' ? null : Number(line.unit_price),
        })),
      });

      if (result.order_reference) {
        router.push(`/admin/encomendas/${result.order_reference}`);
      } else {
        router.push(`/admin/orcamentos/${result.quote_reference}`);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível registar o atendimento.'));
      setSaving(false);
    }
  }

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">A carregar...</div>;
  }

  if (!canCreateIntake) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-600">
          A sua função não tem permissão para registar atendimentos.
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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              Balcão comercial
            </p>
            <h1 className="text-2xl font-bold text-dark">Novo atendimento</h1>
            <p className="text-sm text-gray-500">
              Registe o pedido e coloque-o imediatamente no fluxo de trabalho.
            </p>
          </div>
        </div>
        <Button type="submit" disabled={saving} className="gap-2">
          <UserRoundPlus className="h-4 w-4" />
          {saving ? 'A registar...' : 'Registar atendimento'}
        </Button>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-dark">Origem do contacto</h2>
            <p className="text-sm text-gray-500">Como é que este pedido chegou à Maputo Publicidade?</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {contactSources.map((source) => {
              const Icon = source.icon;
              const selected = contactSource === source.value;
              return (
                <button
                  key={source.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setContactSource(source.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-4 text-left transition',
                    selected
                      ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                      : 'border-[#dfe7e1] bg-white hover:border-brand-200'
                  )}
                >
                  <span className={cn('rounded-xl p-2.5', selected ? 'bg-brand text-white' : 'bg-[#f2f5f2] text-[#617168]')}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-dark">{source.label}</span>
                    <span className="block text-xs text-gray-500">{source.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-dark">Cliente</h2>
            <p className="text-sm text-gray-500">
              Procure um cliente existente ou registe apenas os contactos disponíveis.
            </p>
          </div>
          <div>
            <Label htmlFor="intake-client">Cliente registado</Label>
            <Select id="intake-client" value={clientId} onChange={(event) => selectClient(event.target.value)} className="mt-1">
              <option value="">Novo cliente ou contacto não registado</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}{client.company ? ` — ${client.company}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="intake-name">Nome *</Label>
              <Input id="intake-name" value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="intake-company">Empresa</Label>
              <Input id="intake-company" value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="intake-phone">Telefone</Label>
              <Input id="intake-phone" type="tel" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="intake-email">E-mail</Label>
              <Input id="intake-email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="mt-1" />
            </div>
          </div>
          <p className="text-xs text-gray-500">É necessário pelo menos um telefone ou e-mail.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-dark">Destino no fluxo</h2>
            <p className="text-sm text-gray-500">
              Defina se a equipa comercial ainda deve preparar o preço ou se o cliente já confirmou.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              aria-pressed={outcome === 'quote'}
              onClick={() => setOutcome('quote')}
              className={cn(
                'rounded-2xl border p-5 text-left transition',
                outcome === 'quote'
                  ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100'
                  : 'border-[#dfe7e1] hover:border-sky-200'
              )}
            >
              <ClipboardList className="h-6 w-6 text-sky-700" />
              <span className="mt-3 block font-semibold text-dark">Pedido para orçamento</span>
              <span className="mt-1 block text-sm leading-6 text-gray-600">
                Entra em “Novos pedidos” para análise e preparação da proposta.
              </span>
            </button>
            <button
              type="button"
              aria-pressed={outcome === 'confirmed_order'}
              onClick={() => setOutcome('confirmed_order')}
              className={cn(
                'rounded-2xl border p-5 text-left transition',
                outcome === 'confirmed_order'
                  ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                  : 'border-[#dfe7e1] hover:border-brand-200'
              )}
            >
              <BadgeCheck className="h-6 w-6 text-brand-700" />
              <span className="mt-3 block font-semibold text-dark">Encomenda confirmada</span>
              <span className="mt-1 block text-sm leading-6 text-gray-600">
                Regista a aprovação e entra em “Aprovado”, pronta para planeamento da produção.
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <Label htmlFor="intake-urgency">Prioridade</Label>
              <Select id="intake-urgency" value={urgency} onChange={(event) => setUrgency(event.target.value as 'normal' | 'urgent')} className="mt-1">
                <option value="normal">Normal</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="intake-days">Prazo estimado (dias úteis)</Label>
              <Input id="intake-days" type="number" min="1" max="365" step="1" value={estimatedDeliveryDays} onChange={(event) => setEstimatedDeliveryDays(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="intake-payment">Condição de pagamento</Label>
              <Select id="intake-payment" value={paymentOption} onChange={(event) => setPaymentOption(event.target.value as 'deposit_50' | 'on_delivery')} className="mt-1">
                <option value="deposit_50">50% adiantado + 50% na entrega</option>
                <option value="on_delivery">100% na entrega</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <DocumentItemsEditor
            lines={lines}
            onChange={setLines}
            products={products}
            priceOptional={outcome === 'quote'}
          />
          {outcome === 'quote' ? (
            <p className="mt-3 text-xs text-gray-500">
              Os preços podem ficar em branco enquanto a equipa comercial prepara a proposta.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {outcome === 'confirmed_order' ? (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-lg font-semibold text-dark">Entrega da encomenda</h2>
              <p className="text-sm text-gray-500">Como o cliente pretende receber o trabalho concluído?</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label htmlFor="intake-delivery-method">Método</Label>
                <Select id="intake-delivery-method" value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value as 'pickup' | 'delivery')} className="mt-1">
                  <option value="pickup">Levantamento</option>
                  <option value="delivery">Entrega</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="intake-address">Morada de entrega</Label>
                <Input id="intake-address" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} disabled={deliveryMethod === 'pickup'} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid gap-5 p-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="intake-notes">Observações do cliente</Label>
            <Textarea id="intake-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="intake-internal-notes">Notas internas do atendimento</Label>
            <Textarea id="intake-internal-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={4} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} size="lg" className="gap-2">
          <UserRoundPlus className="h-4 w-4" />
          {saving ? 'A registar...' : 'Registar e abrir no fluxo'}
        </Button>
      </div>
    </form>
  );
}
