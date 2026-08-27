'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Pencil, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { downloadInvoicePdf, getInvoice, updateInvoice, updateInvoiceStatus } from '@/lib/admin-api';
import type { DocumentLineInput } from '@/lib/admin-api';
import type { Invoice, InvoiceStatus } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { companyProfile } from '@/lib/company';
import { formatMZN } from '@/lib/utils';

const statusLabels: Record<InvoiceStatus, string> = {
  draft: 'Rascunho',
  issued: 'Emitida',
  paid: 'Paga',
  cancelled: 'Anulada',
};

const statusTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['draft', 'issued', 'cancelled'],
  issued: ['issued', 'paid', 'cancelled'],
  paid: ['paid'],
  cancelled: ['cancelled', 'draft'],
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-MZ');
}

export default function InvoiceDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const { loading: authLoading, can } = useAdminAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [nextStatus, setNextStatus] = useState<InvoiceStatus>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{
    client_name: string;
    client_email: string;
    client_phone: string;
    client_company: string;
    client_nuit: string;
    billing_address: string;
    issue_date: string;
    due_date: string;
    discount_amount: string;
    tax_rate: string;
    notes: string;
    terms: string;
    items: { description: string; quantity: string; unit_price: string }[];
  } | null>(null);

  useEffect(() => {
    if (authLoading || !reference) return;
    getInvoice(reference)
      .then((data) => {
        setInvoice(data);
        setNextStatus(data.status);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar fatura')));
  }, [authLoading, reference]);

  const statusOptions = invoice ? statusTransitions[invoice.status] : ['draft'] as InvoiceStatus[];
  const canEdit = Boolean(invoice && invoice.status === 'draft' && can('invoices.manage'));

  function startEditing() {
    if (!invoice) return;
    setForm({
      client_name: invoice.client_name,
      client_email: invoice.client_email ?? '',
      client_phone: invoice.client_phone ?? '',
      client_company: invoice.client_company ?? '',
      client_nuit: invoice.client_nuit ?? '',
      billing_address: invoice.billing_address ?? '',
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      discount_amount: String(invoice.discount_amount ?? 0),
      tax_rate: String(invoice.tax_rate ?? 0),
      notes: invoice.notes ?? '',
      terms: invoice.terms ?? '',
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
      })),
    });
    setEditing(true);
    setError('');
    setMessage('');
  }

  function updateItem(index: number, field: 'description' | 'quantity' | 'unit_price', value: string) {
    setForm((current) => {
      if (!current) return current;
      const items = current.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...current, items };
    });
  }

  async function saveEdit() {
    if (!invoice || !form) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const items: DocumentLineInput[] = form.items.map((item, position) => ({
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
      }));
      const updated = await updateInvoice(invoice.reference, {
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        client_company: form.client_company,
        client_nuit: form.client_nuit,
        billing_address: form.billing_address,
        issue_date: form.issue_date,
        due_date: form.due_date,
        discount_amount: Number(form.discount_amount) || 0,
        tax_rate: Number(form.tax_rate) || 0,
        notes: form.notes,
        terms: form.terms,
        items,
      });
      setInvoice(updated);
      setEditing(false);
      setForm(null);
      setMessage('Fatura atualizada.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível guardar as alterações.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveStatus() {
    if (!invoice) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateInvoiceStatus(invoice.reference, nextStatus);
      setInvoice(updated);
      setNextStatus(updated.status);
      setMessage('Estado da fatura atualizado.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível atualizar o estado.'));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !invoice) {
    return <div className="flex h-64 items-center justify-center text-gray-500">A carregar...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="print-hidden flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/faturas')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-dark">{invoice.reference}</h1>
              <StatusBadge status={invoice.status} label={invoice.status_display} />
            </div>
            <p className="text-sm text-gray-500">Emitida para {invoice.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !editing ? (
            <Button variant="outline" className="gap-2" onClick={startEditing}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              downloadInvoicePdf(invoice.reference).catch((err) =>
                setError(getApiErrorMessage(err, 'Erro ao descarregar PDF'))
              )
            }
          >
            <Download className="h-4 w-4" /> Descarregar PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {error ? <div className="print-hidden rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="print-hidden rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</div> : null}

      {can('invoices.manage') ? (
        <Card className="print-hidden">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-end">
            <div className="w-full sm:w-56">
              <Label htmlFor="status">Estado do documento</Label>
              <Select id="status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as InvoiceStatus)} className="mt-1">
                {statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </Select>
            </div>
            <Button onClick={saveStatus} disabled={saving || nextStatus === invoice.status} className="gap-2">
              <Save className="h-4 w-4" /> Guardar estado
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {editing && form ? (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark">Editar fatura</h2>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setEditing(false); setForm(null); }}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="client_name">Nome do cliente *</Label>
                <Input id="client_name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="client_company">Empresa</Label>
                <Input id="client_company" value={form.client_company} onChange={(e) => setForm({ ...form, client_company: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="client_email">E-mail</Label>
                <Input id="client_email" type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="client_phone">Telefone</Label>
                <Input id="client_phone" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="client_nuit">NUIT</Label>
                <Input id="client_nuit" value={form.client_nuit} onChange={(e) => setForm({ ...form, client_nuit: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="billing_address">Morada de faturação</Label>
                <Input id="billing_address" value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="issue_date">Data de emissão</Label>
                <Input id="issue_date" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="due_date">Vencimento</Label>
                <Input id="due_date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="discount_amount">Desconto (MZN)</Label>
                <Input id="discount_amount" type="number" step="0.01" min="0" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="tax_rate">IVA (%)</Label>
                <Input id="tax_rate" type="number" step="0.01" min="0" max="100" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Itens</Label>
              <div className="mt-2 space-y-2">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_90px_130px_40px] items-center gap-2">
                    <Input placeholder="Descrição" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                    <Input type="number" min="0" step="0.01" placeholder="Qtd" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                    <Input type="number" min="0" step="0.01" placeholder="Preço unit." value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-2"
                onClick={() => setForm({ ...form, items: [...form.items, { description: '', quantity: '1', unit_price: '0' }] })}
              >
                <Plus className="h-4 w-4" /> Adicionar item
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="terms">Condições de pagamento</Label>
                <Textarea id="terms" rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className="mt-1" />
              </div>
            </div>

            <Button onClick={saveEdit} disabled={saving || !form.client_name.trim() || form.items.length === 0} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'A guardar...' : 'Guardar alterações'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!editing ? (
      <article className="print-document overflow-hidden rounded-2xl border border-[#dfe7e1] bg-white shadow-sm">
        <div className="border-b border-[#e3e9e5] bg-[#f7faf7] px-8 py-7 sm:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Image src="/logo-tight.png" alt="Maputo Publicidade" width={180} height={68} className="h-14 w-auto object-contain" priority />
              <p className="mt-3 text-sm text-gray-600">{companyProfile.legalName}</p>
              {companyProfile.nuit ? <p className="text-sm text-gray-500">NUIT: {companyProfile.nuit}</p> : null}
              <p className="text-sm text-gray-500">{companyProfile.address}</p>
              <p className="text-sm text-gray-500">{companyProfile.email}</p>
              {companyProfile.phone ? <p className="text-sm text-gray-500">{companyProfile.phone}</p> : null}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Fatura</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-dark">{invoice.reference}</h2>
              <div className="mt-3 inline-flex"><StatusBadge status={invoice.status} label={invoice.status_display} /></div>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-8 py-8 sm:px-12">
          <div className="grid gap-6 border-b border-[#e6ebe7] pb-7 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Faturar a</p>
              <p className="mt-2 text-lg font-semibold text-dark">{invoice.client_company || invoice.client_name}</p>
              {invoice.client_company ? <p className="text-sm text-gray-600">{invoice.client_name}</p> : null}
              {invoice.client_nuit ? <p className="mt-1 text-sm text-gray-600">NUIT: {invoice.client_nuit}</p> : null}
              {invoice.billing_address ? <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{invoice.billing_address}</p> : null}
              {invoice.client_email ? <p className="mt-1 text-sm text-gray-600">{invoice.client_email}</p> : null}
              {invoice.client_phone ? <p className="text-sm text-gray-600">{invoice.client_phone}</p> : null}
            </div>
            <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3 text-sm sm:ml-auto sm:min-w-72">
              <dt className="text-gray-500">Data de emissão</dt><dd className="text-right font-medium text-dark">{formatDate(invoice.issue_date)}</dd>
              <dt className="text-gray-500">Vencimento</dt><dd className="text-right font-medium text-dark">{formatDate(invoice.due_date)}</dd>
              {invoice.order_reference ? (
                <><dt className="text-gray-500">Encomenda</dt><dd className="text-right font-medium text-brand-700"><Link href={`/admin/encomendas/${invoice.order_reference}`}>{invoice.order_reference}</Link></dd></>
              ) : null}
              <dt className="text-gray-500">Moeda</dt><dd className="text-right font-medium text-dark">{invoice.currency}</dd>
            </dl>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b-2 border-brand-800 text-left text-xs uppercase tracking-[0.08em] text-gray-500">
                  <th className="py-3 pr-4 font-semibold">Descrição</th>
                  <th className="px-3 py-3 text-right font-semibold">Qtd.</th>
                  <th className="px-3 py-3 text-right font-semibold">Preço unit.</th>
                  <th className="py-3 pl-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id ?? item.description} className="border-b border-[#edf1ee]">
                    <td className="py-4 pr-4 font-medium text-dark">{item.description}</td>
                    <td className="px-3 py-4 text-right text-gray-600">{Number(item.quantity).toLocaleString('pt-MZ')}</td>
                    <td className="px-3 py-4 text-right text-gray-600">{formatMZN(item.unit_price)}</td>
                    <td className="py-4 pl-3 text-right font-semibold text-dark">{formatMZN(item.line_total ?? item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <dl className="w-full max-w-sm space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="font-medium">{formatMZN(invoice.subtotal)}</dd></div>
              {invoice.discount_amount > 0 ? <div className="flex justify-between"><dt className="text-gray-500">Desconto</dt><dd className="font-medium">- {formatMZN(invoice.discount_amount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-gray-500">IVA ({Number(invoice.tax_rate).toLocaleString('pt-MZ')}%)</dt><dd className="font-medium">{formatMZN(invoice.tax_amount)}</dd></div>
              <div className="flex justify-between border-t-2 border-brand-800 pt-3 text-lg"><dt className="font-bold text-dark">Total</dt><dd className="font-bold text-dark">{formatMZN(invoice.total)}</dd></div>
              {invoice.amount_paid > 0 ? <div className="flex justify-between text-green-700"><dt>Valor pago</dt><dd className="font-semibold">{formatMZN(invoice.amount_paid)}</dd></div> : null}
              {invoice.balance_due > 0 ? <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-amber-800"><dt>Em dívida</dt><dd className="font-bold">{formatMZN(invoice.balance_due)}</dd></div> : null}
            </dl>
          </div>

          {invoice.notes || invoice.terms ? (
            <div className="grid gap-5 border-t border-[#e6ebe7] pt-6 sm:grid-cols-2">
              {invoice.notes ? <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Observações</p><p className="mt-2 whitespace-pre-line text-sm text-gray-600">{invoice.notes}</p></div> : null}
              {invoice.terms ? <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Condições de pagamento</p><p className="mt-2 whitespace-pre-line text-sm text-gray-600">{invoice.terms}</p></div> : null}
            </div>
          ) : null}
        </div>
      </article>
      ) : null}
    </div>
  );
}
