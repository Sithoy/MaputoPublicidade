'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FilePlus2 } from 'lucide-react';
import { DocumentItemsEditor, newDocumentLine, type EditableDocumentLine } from '@/components/admin/DocumentItemsEditor';
import { ProposalAssistant } from '@/components/admin/ProposalAssistant';
import type { AdminQuote, ProposalPreparation } from '@/lib/admin-api';
import { QuoteRequestEvidence } from '@/components/QuoteRequestEvidence';
import { fetchWithAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { createManualQuote, createReceptionIntake, prepareExistingQuote, getQuote, getClientOptions, getProducts } from '@/lib/admin-api';
import type { ClientOption, Product } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatMZN } from '@/lib/utils';

export default function RequestForm({ reference, onSaved, onClose, focused = false, initialQuote, onBusyChange, onDirtyChange }: {
  reference?: string; onSaved?: (reference: string, intent?: 'save' | 'send') => void; onClose?: () => void;
  focused?: boolean; initialQuote?: AdminQuote; onBusyChange?: (busy: boolean) => void; onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const { loading: authLoading, can } = useAdminAuth();
  const canManage = can('quotes.manage');
  const canIntake = can('intake.create');
  const canCreate = canManage || canIntake;
  const [mode, setMode] = useState<'request' | 'proposal' | 'confirmed'>(reference ? 'proposal' : 'request');
  const [contactSource, setContactSource] = useState<'walk_in' | 'phone' | 'whatsapp' | 'email' | 'web'>('walk_in');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loaded, setLoaded] = useState(!reference);
  const priced = mode !== 'request';
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNuit, setClientNuit] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('10');
  const [paymentOption, setPaymentOption] = useState<'deposit_50' | 'on_delivery'>('deposit_50');
  const [notes, setNotes] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [terms, setTerms] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [internalNotes, setInternalNotes] = useState('');
  const [lines, setLines] = useState<EditableDocumentLine[]>([newDocumentLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preparationId, setPreparationId] = useState<number>();
  const [reviewed, setReviewed] = useState(false);

  function applyPreparation(preparation: ProposalPreparation) {
    const draft = preparation.draft;
    setPreparationId(preparation.id);
    setReviewed(false);
    setClientId('');
    setClientName(draft.client_company || draft.client_name);
    setClientEmail(draft.client_email);
    setClientPhone(draft.client_phone);
    setClientNuit(draft.client_nuit ?? '');
    setNotes('');
    setUrgency('normal');
    setEstimatedDeliveryDays('');
    setInternalNotes([
      'Pedido organizado com IA — confirmar com as fontes originais.',
      draft.summary,
      draft.requested_deadline ? `Prazo solicitado: ${draft.requested_deadline}` : '',
      ...draft.items.map((item, index) => `Fonte do item ${index + 1}: ${item.source}`),
      ...draft.questions.map((question) => `Confirmar: ${question}`),
    ].filter(Boolean).join('\n'));
    setLines(draft.items.map((item) => ({
      ...newDocumentLine(), description: item.description,
      quantity: item.quantity === null ? '' : String(item.quantity),
      unit_price: '', notes: item.specifications,
    })));
  }

  useEffect(() => {
    if (authLoading || !canCreate || (reference && !canManage)) return;
    let active = true;
    Promise.all([focused ? Promise.resolve([]) : getClientOptions(), getProducts(), reference ? initialQuote ? Promise.resolve(initialQuote) : getQuote(reference) : Promise.resolve(null)])
      .then(([clientData, productData, quote]) => {
        if (!active) return;
        setClients(clientData);
        setProducts(productData.filter((product) => product.is_active !== false));
        if (quote) {
          if (!['received', 'reviewing', 'quoted'].includes(quote.status) || quote.order_reference) {
            setError('Este pedido já não pode ser preparado como proposta.');
            return;
          }
          setClientId(quote.user ? String(quote.user) : '');
          setClientName(quote.client_company || quote.client_name);
          setClientEmail(quote.client_email);
          setClientPhone(quote.client_phone || '');
          setClientNuit(quote.client_nuit || '');
          setBillingAddress(quote.billing_address || ''); setValidUntil(quote.valid_until || ''); setTerms(quote.terms || '');
          setDiscountType(quote.discount_type || 'fixed');
          setDiscount(String(quote.discount_type === 'percentage' ? quote.discount_percentage || 0 : quote.discount_amount || 0));
          setTaxRate(String(quote.tax_rate || 0));
          setNotes(quote.notes || '');
          setInternalNotes(quote.internal_notes || '');
          setUrgency(quote.urgency === 'urgent' ? 'urgent' : 'normal');
          setEstimatedDeliveryDays(quote.estimated_delivery_days ? String(quote.estimated_delivery_days) : '');
          setPaymentOption(quote.payment_option || 'deposit_50');
          setContactSource(quote.contact_source || 'web');
          setLines(quote.items.map((item) => ({ ...newDocumentLine(), item_id: item.id, product_id: item.product,
            material_briefing: item.material_briefing,
            description: item.description, quantity: String(item.quantity),
            unit_price: item.unit_price == null ? '' : String(item.unit_price), notes: item.notes || '',
          })));
        }
        setLoaded(true);
      })
      .catch((err) => { if (active) setError(getApiErrorMessage(err, 'Erro ao carregar dados do formulário')); });
    return () => { active = false; };
  }, [authLoading, canCreate, canManage, reference, focused, initialQuote]);

  function selectClient(value: string) {
    setClientId(value);
    const client = clients.find((item) => item.id === Number(value));
    if (!client) return;
    setClientName(client.company || client.name);
    setClientEmail(client.email);
    setClientPhone(client.phone ?? '');
    setClientNuit(client.nuit ?? '');
    setBillingAddress(client.address ?? '');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!loaded || saving) return;
    const intent = focused && (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'send' ? 'send' : 'save';
    setError('');
    if (preparationId && !reviewed) {
      setError('Confirme a revisão dos dados, quantidades, preços e condições antes de criar a proposta.');
      return;
    }
    const invalidLine = lines.find(
      (line) =>
        !line.description.trim() ||
        !Number.isInteger(Number(line.quantity)) ||
        Number(line.quantity) < 1 ||
        (priced && line.unit_price === '') ||
        !Number.isFinite(Number(line.unit_price)) ||
        Number(line.unit_price) < 0
    );
    if (!lines.length || invalidLine) {
      setError('Preencha a descrição, uma quantidade inteira e o preço de cada item.');
      return;
    }
    if (!clientName.trim() || !(clientEmail.trim() || clientPhone.trim())) {
      setError('Indique o nome e pelo menos um telefone ou e-mail do cliente.');
      return;
    }
    const deliveryDays = Number(estimatedDeliveryDays);
    if ((priced || estimatedDeliveryDays !== '') && (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365)) {
      setError('Indique um prazo estimado entre 1 e 365 dias úteis.');
      return;
    }
    if (intent === 'send' && !window.confirm('Guardar as condições atuais e disponibilizar a proposta no BrandDesk? Para clientes sem conta, envie também o PDF pelo canal acordado. Não são enviadas mensagens por email ou WhatsApp automaticamente.')) return;
    setSaving(true); onBusyChange?.(true);
    let persisted = false;
    try {
      const data = {
        preparation_id: preparationId,
        ai_reviewed: reviewed,
        user_id: clientId ? Number(clientId) : null,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_company: '',
        client_nuit: clientNuit.trim(),
        ...(mode === 'proposal' ? { billing_address: billingAddress.trim(), valid_until: validUntil || null, terms: terms.trim(), discount_type: discountType,
          discount_amount: discountType === 'fixed' ? Number(discount) : 0,
          discount_percentage: discountType === 'percentage' ? Number(discount) : 0, tax_rate: Number(taxRate) } : {}),
        contact_source: contactSource,
        urgency,
        estimated_delivery_days: deliveryDays,
        payment_option: paymentOption,
        notes: notes.trim(),
        internal_notes: internalNotes.trim(),
        items: lines.map((line) => ({
          item_id: line.item_id,
          product_id: line.product_id,
          description: line.description.trim(),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          notes: line.notes?.trim(),
          ...(line.material_briefing ? { material_briefing: line.material_briefing } : {}),
        })),
      };
      if (mode !== 'proposal') {
        if (mode === 'confirmed' && deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
          setError('Indique a morada de entrega.'); setSaving(false); return;
        }
        const result = await createReceptionIntake({ ...data,
          estimated_delivery_days: estimatedDeliveryDays ? deliveryDays : null,
          outcome: mode === 'confirmed' ? 'confirmed_order' : 'quote',
          delivery_method: deliveryMethod, delivery_address: deliveryAddress.trim(),
          items: data.items.map((item, index) => ({ ...item, unit_price: lines[index].unit_price === '' ? null : item.unit_price })),
        });
        if (onSaved) { onSaved(result.quote_reference); setSaving(false); }
        else router.push(result.order_reference ? `/admin/encomendas/${result.order_reference}` : `/admin/orcamentos/${result.quote_reference}`);
        return;
      }
      const quote = reference ? await prepareExistingQuote(reference, data) : await createManualQuote(data);
      persisted = true;
      if (focused) {
        if (!quote.proposal_workflow) throw new Error('Atualize a proposta antes de continuar.');
        await fetchWithAuth(`/api/quotes/${quote.reference}/proposal-workflow/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: intent, version: quote.proposal_workflow.version, comment: '' }) });
      }
      if (onSaved) { onSaved(quote.reference, intent); setSaving(false); }
      else router.push(`/admin/orcamentos/${quote.reference}`);
    } catch (err) {
      if (persisted && focused && reference) {
        try {
          const current = await getQuote(reference);
          // A lost response must not turn a completed send into a second publication.
          if (current?.proposal_workflow?.stage === (intent === 'send' ? 'sent' : 'approved')) {
            setSaving(false);
            if (onSaved) onSaved(reference, intent); else router.push(`/admin/orcamentos/${reference}`);
            return;
          }
        } catch { /* Keep the editor intact when completion cannot be confirmed. */ }
      }
      const message = getApiErrorMessage(err, 'Não foi possível guardar a proposta.');
      setError(persisted && focused ? `Os dados foram guardados, mas não foi possível confirmar a conclusão desta ação. ${message}` : message);
      setSaving(false);
    } finally { onBusyChange?.(false); }
  }

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">A carregar...</div>;
  }

  if (!canCreate || (reference && !canManage)) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-600">
          A sua função não tem permissão para executar esta operação.
        </CardContent>
      </Card>
    );
  }

  if (focused) {
    const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0);
    const deduction = discountType === 'percentage' ? Math.round(subtotal * (Number(discount) || 0)) / 100 : Number(discount) || 0;
    const tax = Math.round(Math.max(0, subtotal - deduction) * (Number(taxRate) || 0)) / 100;
    const total = Math.max(0, subtotal - deduction) + tax;
    return <form aria-label="Preparar proposta" onSubmit={handleSubmit} className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dce3d3] pb-5">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Proposta · {reference}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-900">{clientName || initialQuote?.client_company || initialQuote?.client_name || 'Preparar proposta'}</h2><p className="mt-1 text-xs text-slate-500">Artigos, preços e condições para o cliente.</p></div>
        <span className="rounded-full border border-[#d8c38e] bg-[#faf6e9] px-3 py-1.5 text-xs font-medium text-[#765c2b]">{saving ? 'A guardar…' : 'Em preparação'}</span>
      </header>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {!loaded && !error ? <p role="status" className="text-sm text-slate-500">A carregar os artigos da proposta…</p> : null}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <fieldset disabled={saving || !loaded} className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-[#dce3d3] bg-white p-4 sm:p-5"><DocumentItemsEditor lines={lines} onChange={(value) => { setLines(value); onDirtyChange?.(true); }} products={products} /></section>
          <section className="space-y-4 rounded-2xl border border-[#dce3d3] bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-brand-900">Entrega e pagamento</h3>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="estimated-delivery">Prazo de entrega (dias úteis) *</Label><Input id="estimated-delivery" type="number" min="1" max="365" step="1" required value={estimatedDeliveryDays} onChange={(event) => setEstimatedDeliveryDays(event.target.value)} /><p className="mt-1 text-xs text-slate-500">Após a adjudicação da proposta.</p></div>
              <div><Label htmlFor="payment-option">Condição de pagamento</Label><Select id="payment-option" value={paymentOption} onChange={(event) => setPaymentOption(event.target.value as 'deposit_50' | 'on_delivery')}><option value="deposit_50">50% adiantado + 50% na entrega</option><option value="on_delivery">100% na entrega</option></Select></div>
              <div><Label htmlFor="proposal-valid-until">Válida até</Label><Input id="proposal-valid-until" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></div></div>
            <div><Label htmlFor="proposal-terms">Condições e exclusões</Label><Textarea id="proposal-terms" maxLength={10000} value={terms} onChange={(event) => setTerms(event.target.value)} rows={3} /></div>
            <div><Label htmlFor="notes">Observações para o cliente</Label><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} /></div>
          </section>
          <details className="rounded-2xl border border-[#dce3d3] bg-white p-4 sm:p-5"><summary className="cursor-pointer text-sm font-semibold text-brand-900">Dados do cliente e faturação{!clientNuit ? ' · NUIT por preencher' : ''}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="client-name">Nome do cliente ou empresa *</Label><Input id="client-name" required value={clientName} onChange={(event) => setClientName(event.target.value)} /></div>
            <div><Label htmlFor="client-nuit">NUIT</Label><Input id="client-nuit" maxLength={50} value={clientNuit} onChange={(event) => setClientNuit(event.target.value)} /></div>
            <div><Label htmlFor="client-email">E-mail</Label><Input id="client-email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} /></div>
            <div><Label htmlFor="client-phone">Telefone</Label><Input id="client-phone" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} /></div>
            <div className="sm:col-span-2"><Label htmlFor="proposal-billing-address">Morada de faturação</Label><Textarea id="proposal-billing-address" maxLength={2000} value={billingAddress} onChange={(event) => setBillingAddress(event.target.value)} rows={2} /></div>
          </div></details>
          {initialQuote ? <details className="rounded-2xl border border-[#dce3d3] bg-white p-4 sm:p-5"><summary className="cursor-pointer text-sm font-semibold text-brand-900">Consultar briefing e referências</summary><div className="mt-4 space-y-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{initialQuote.reception?.briefing?.description || initialQuote.briefing?.notes || 'Consulte os materiais e anexos do pedido.'}</p><QuoteRequestEvidence quote={initialQuote} /></div></details> : null}
          <details className="rounded-2xl border border-[#dce3d3] bg-white p-4 sm:p-5"><summary className="cursor-pointer text-sm font-semibold text-brand-900">Nota interna da proposta</summary><div className="mt-4"><Label htmlFor="internal-notes">Não será apresentada ao cliente</Label><Textarea id="internal-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={2} /></div></details>
        </fieldset>
        <aside aria-label="Resumo comercial" className="rounded-2xl border border-[#dce3d3] border-t-[3px] border-t-[#c7aa68] bg-[#f5f7ee] p-5 xl:sticky xl:top-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Resumo da proposta</p><p className="mt-2 text-xs text-slate-500">{lines.length} {lines.length === 1 ? 'artigo' : 'artigos'} · MZN</p>
          <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt>Subtotal</dt><dd className="tabular-nums">{formatMZN(subtotal)}</dd></div><div className="flex justify-between gap-3"><dt>Desconto</dt><dd className="tabular-nums">−{formatMZN(deduction)}</dd></div><div className="flex justify-between gap-3"><dt>IVA ({taxRate || 0}%)</dt><dd className="tabular-nums">{formatMZN(tax)}</dd></div><div className="border-t border-[#dce3d3] pt-4"><dt className="text-xs text-slate-500">Total estimado</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-900">{formatMZN(total)}</dd></div></dl>
          <fieldset disabled={saving || !loaded} className="mt-5 space-y-3 border-t border-[#dce3d3] pt-4"><legend className="sr-only">Ajustes comerciais</legend>
            <div><Label htmlFor="proposal-discount-type">Desconto</Label><Select id="proposal-discount-type" value={discountType} onChange={(event) => { setDiscountType(event.target.value as 'fixed' | 'percentage'); setDiscount('0'); }}><option value="fixed">Valor fixo (MZN)</option><option value="percentage">Percentagem (%)</option></Select></div>
            <div><Label htmlFor="proposal-discount">Valor do desconto ({discountType === 'percentage' ? '%' : 'MZN'})</Label><Input id="proposal-discount" type="number" min="0" max={discountType === 'percentage' ? 100 : subtotal} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
            <div><Label htmlFor="proposal-tax-rate">IVA (%)</Label><Input id="proposal-tax-rate" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} /></div>
          </fieldset><p className="mt-4 text-xs leading-5 text-slate-500">O servidor valida os valores finais ao guardar.</p>
        </aside>
      </div>
      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce3d3] bg-[#fffefb] p-4 shadow-[0_-4px_20px_rgb(19_60_46/5%)]">
        <p className="text-xs text-slate-500">Guardar mantém a proposta privada.</p><div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button type="button" className="min-h-11 text-sm" variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="min-h-11 text-sm" name="intent" value="save" variant="outline" disabled={saving || !loaded}>Guardar proposta</Button>
          <Button type="submit" className="min-h-11 text-sm" name="intent" value="send" disabled={saving || !loaded}>Guardar e enviar</Button>
        </div>
      </footer>
    </form>;
  }

  return (
    <form onSubmit={handleSubmit} onChangeCapture={(event) => {
      if (preparationId && (event.target as HTMLElement).id !== 'ai-reviewed') setReviewed(false);
    }} className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onClose ? onClose() : router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-dark">{reference ? `Preparar proposta · ${reference}` : 'Novo pedido'}</h1>
            <p className="text-sm text-gray-500">Pedido → proposta → aceitação do cliente → produção → entrega. Uma referência, um histórico.</p>
          </div>
        </div>
        <Button type="submit" disabled={saving || !loaded} className="gap-2">
          <FilePlus2 className="h-4 w-4" />
          {saving ? 'A guardar...' : mode === 'request' ? 'Registar pedido' : mode === 'confirmed' ? 'Registar encomenda confirmada' : 'Guardar proposta'}
        </Button>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!reference ? <Card><CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Como pretende começar?</h2>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant={mode === 'request' ? 'primary' : 'outline'} aria-pressed={mode === 'request'} onClick={() => { setMode('request'); setPreparationId(undefined); }}>Registar pedido sem preço</Button>
          {canManage ? <Button type="button" variant={mode === 'proposal' ? 'primary' : 'outline'} aria-pressed={mode === 'proposal'} onClick={() => setMode('proposal')}>Preparar proposta</Button> : null}
          {canIntake && can('quotes.review') ? <Button type="button" variant={mode === 'confirmed' ? 'primary' : 'outline'} aria-pressed={mode === 'confirmed'} onClick={() => { setMode('confirmed'); setPreparationId(undefined); }}>Encomenda já confirmada</Button> : null}
        </div>
        <p className="text-sm text-gray-500">Registe o contacto agora e complete a proposta no mesmo pedido quando os preços estiverem definidos.</p>
        <Label htmlFor="request-source">Origem do pedido</Label>
        <Select id="request-source" value={contactSource} onChange={(event) => setContactSource(event.target.value as typeof contactSource)}>
          <option value="walk_in">Presencial</option><option value="phone">Telefone</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="web">BrandDesk / Website</option>
        </Select>
      </CardContent></Card> : null}
      {mode === 'proposal' && !reference ? <ProposalAssistant onApply={applyPreparation} /> : null}
      {mode === 'proposal' ? <Card><CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Condições da proposta</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor="proposal-valid-until">Válida até</Label><Input id="proposal-valid-until" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></div>
          <div><Label htmlFor="proposal-discount-type">Tipo de desconto</Label><Select id="proposal-discount-type" value={discountType} onChange={(event) => { setDiscountType(event.target.value as 'fixed' | 'percentage'); setDiscount('0'); }}><option value="fixed">Valor fixo (MZN)</option><option value="percentage">Percentagem (%)</option></Select></div>
          <div><Label htmlFor="proposal-discount">Desconto ({discountType === 'percentage' ? '%' : 'MZN'})</Label><Input id="proposal-discount" type="number" min="0" max={discountType === 'percentage' ? 100 : undefined} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
          <div><Label htmlFor="proposal-tax-rate">IVA (%)</Label><Input id="proposal-tax-rate" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} /></div>
        </div>
        <div><Label htmlFor="proposal-billing-address">Morada de faturação</Label><Textarea id="proposal-billing-address" maxLength={2000} value={billingAddress} onChange={(event) => setBillingAddress(event.target.value)} rows={2} /></div>
        <div><Label htmlFor="proposal-terms">Condições comerciais e exclusões</Label><Textarea id="proposal-terms" maxLength={10000} value={terms} onChange={(event) => setTerms(event.target.value)} rows={3} /></div>
        <p className="rounded-xl bg-brand-50 p-4 text-sm">Total estimado: <strong>{formatMZN((() => {
          const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0);
          const deduction = discountType === 'percentage' ? Math.round(subtotal * (Number(discount) || 0)) / 100 : Number(discount) || 0;
          const taxable = Math.max(0, subtotal - deduction);
          return taxable + Math.round(taxable * (Number(taxRate) || 0)) / 100;
        })())}</strong> · Desconto antes do IVA. O valor final é validado ao guardar.</p>
      </CardContent></Card> : null}
      {preparationId ? (
        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <input id="ai-reviewed" type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1" />
          Confirmei com as fontes os dados do cliente, especificações, quantidades, preços, prazo e pagamento. Resolvi as dúvidas do pedido.
        </label>
      ) : null}

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
              <Label htmlFor="client-name">Nome do cliente ou empresa *</Label>
              <Input id="client-name" value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="client-email">E-mail</Label>
              <Input id="client-email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="client-phone">Telefone</Label>
              <Input id="client-phone" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="client-nuit">NUIT</Label>
              <Input id="client-nuit" value={clientNuit} maxLength={50} onChange={(event) => setClientNuit(event.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-dark">Condições comerciais</h2>
              <p className="text-sm text-gray-500">
                Defina o prazo e a condição de pagamento que serão apresentados ao cliente.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {priced ? 'Obrigatório' : 'Pode completar depois'}
            </span>
          </div>

          <div className="grid gap-5 rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 lg:grid-cols-3">
            <div>
              <Label htmlFor="urgency">Prioridade</Label>
              <Select id="urgency" value={urgency} onChange={(event) => setUrgency(event.target.value as 'normal' | 'urgent')} className="mt-1">
                <option value="normal">Normal</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimated-delivery">{priced ? 'Prazo de entrega (dias úteis) *' : 'Prazo estimado (dias úteis)'}</Label>
              <Input
                id="estimated-delivery"
                type="number"
                min="1"
                max="365"
                step="1"
                required={priced}
                value={estimatedDeliveryDays}
                onChange={(event) => setEstimatedDeliveryDays(event.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">Após a adjudicação da proposta.</p>
            </div>
            <div>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <DocumentItemsEditor lines={lines} onChange={setLines} products={products} priceOptional={!priced} />
        </CardContent>
      </Card>

      {mode === 'confirmed' ? <Card><CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Entrega da encomenda</h2>
        <Label htmlFor="delivery-method">Método</Label>
        <Select id="delivery-method" value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value as 'pickup' | 'delivery')}><option value="pickup">Levantamento</option><option value="delivery">Entrega</option></Select>
        {deliveryMethod === 'delivery' ? <><Label htmlFor="delivery-address">Morada de entrega</Label><Input id="delivery-address" required value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} /></> : null}
        <p className="text-sm text-gray-500">Use apenas quando o cliente já confirmou os preços e condições.</p>
      </CardContent></Card> : null}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-dark">Notas do pedido</h2>
            <p className="text-sm text-gray-500">Separe as informações visíveis pelo cliente das notas internas.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <Label htmlFor="notes">Observações para o cliente</Label>
              <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="internal-notes">Notas internas</Label>
              <Textarea id="internal-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
