'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileCheck2, Pencil, Printer, Save, X } from 'lucide-react';
import { DocumentItemsEditor, type EditableDocumentLine } from '@/components/admin/DocumentItemsEditor';
import { InvoiceDocument } from '@/components/admin/InvoiceDocument';
import { InvoiceTermsCard } from '@/components/admin/InvoiceTermsCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { downloadInvoicePdf, getInvoice, getProducts, updateInvoice, updateInvoiceStatus } from '@/lib/admin-api';
import type { DocumentLineInput } from '@/lib/admin-api';
import type { Invoice, InvoiceStatus, Product } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';

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

export default function InvoiceDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const { loading: authLoading, can } = useAdminAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
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
    items: EditableDocumentLine[];
  } | null>(null);

  useEffect(() => {
    if (authLoading || !reference) return;
    Promise.all([getInvoice(reference), getProducts().catch(() => [])])
      .then(([data, productData]) => {
        setInvoice(data);
        setNextStatus(data.status);
        setProducts(productData.filter((product) => product.is_active !== false));
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar fatura')));
  }, [authLoading, reference]);

  const statusOptions = invoice ? statusTransitions[invoice.status] : ['draft'] as InvoiceStatus[];
  const canEdit = Boolean(invoice && invoice.status === 'draft' && can('invoices.manage'));
  const editSubtotal = form
    ? form.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
      )
    : 0;

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
      items: invoice.items.map((item, index) => ({
        key: `invoice-${item.id ?? index}`,
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
      })),
    });
    setEditing(true);
    setError('');
    setMessage('');
  }

  async function saveEdit() {
    if (!invoice || !form) return;
    if (!form.client_name.trim()) {
      setError('Indique o nome do cliente.');
      return;
    }
    if (
      form.items.some(
        (item) =>
          !item.description.trim() ||
          Number(item.quantity) <= 0 ||
          item.unit_price === '' ||
          Number(item.unit_price) < 0
      )
    ) {
      setError('Preencha corretamente todos os itens da fatura.');
      return;
    }
    if (form.due_date < form.issue_date) {
      setError('A data de vencimento não pode anteceder a data de emissão.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const items: DocumentLineInput[] = form.items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
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
    <div className={`mx-auto space-y-6 ${editing ? 'max-w-6xl' : 'max-w-5xl'}`}>
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
        <Card className="print-hidden border-[#dce6df] shadow-[0_12px_34px_-26px_rgba(6,63,43,0.35)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <FileCheck2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-dark">Fluxo do documento</p>
                <p className="text-xs text-gray-500">Atualize o estado quando a fatura avançar.</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
              <div className="w-full sm:w-56">
                <Label htmlFor="status">Estado do documento</Label>
                <Select id="status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as InvoiceStatus)} className="mt-1">
                  {statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                </Select>
              </div>
              <Button onClick={saveStatus} disabled={saving || nextStatus === invoice.status} className="gap-2">
                <Save className="h-4 w-4" /> Guardar estado
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {editing && form ? (
        <div className="space-y-6">
          <Card className="border-[#dce6df] shadow-[0_12px_34px_-26px_rgba(6,63,43,0.35)]">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-dark">Dados fiscais do cliente</h2>
                  <p className="text-sm text-gray-500">Atualize os dados que serão apresentados nesta fatura.</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  A editar
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-client-name">Nome do cliente *</Label>
                  <Input id="edit-client-name" value={form.client_name} onChange={(event) => setForm({ ...form, client_name: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-client-company">Empresa</Label>
                  <Input id="edit-client-company" value={form.client_company} onChange={(event) => setForm({ ...form, client_company: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-client-email">E-mail</Label>
                  <Input id="edit-client-email" type="email" value={form.client_email} onChange={(event) => setForm({ ...form, client_email: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-client-phone">Telefone</Label>
                  <Input id="edit-client-phone" value={form.client_phone} onChange={(event) => setForm({ ...form, client_phone: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-client-nuit">NUIT</Label>
                  <Input id="edit-client-nuit" value={form.client_nuit} onChange={(event) => setForm({ ...form, client_nuit: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-billing-address">Morada de faturação</Label>
                  <Input id="edit-billing-address" value={form.billing_address} onChange={(event) => setForm({ ...form, billing_address: event.target.value })} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#dce6df] shadow-[0_12px_34px_-26px_rgba(6,63,43,0.35)]">
            <CardContent className="p-6">
              <DocumentItemsEditor
                lines={form.items}
                onChange={(items) => setForm({ ...form, items })}
                products={products}
              />
            </CardContent>
          </Card>

          <InvoiceTermsCard
            issueDate={form.issue_date}
            dueDate={form.due_date}
            discount={form.discount_amount}
            taxRate={form.tax_rate}
            notes={form.notes}
            terms={form.terms}
            subtotal={editSubtotal}
            idPrefix="edit-invoice"
            onIssueDateChange={(issue_date) => setForm({ ...form, issue_date })}
            onDueDateChange={(due_date) => setForm({ ...form, due_date })}
            onDiscountChange={(discount_amount) => setForm({ ...form, discount_amount })}
            onTaxRateChange={(tax_rate) => setForm({ ...form, tax_rate })}
            onNotesChange={(notes) => setForm({ ...form, notes })}
            onTermsChange={(terms) => setForm({ ...form, terms })}
          />

          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-[#dce6df] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" className="gap-2" onClick={() => { setEditing(false); setForm(null); }}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={saving || !form.client_name.trim() || form.items.length === 0} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'A guardar...' : 'Guardar alterações'}
            </Button>
          </div>
        </div>
      ) : null}

      {!editing ? (
        <InvoiceDocument invoice={invoice} />
      ) : null}
    </div>
  );
}
