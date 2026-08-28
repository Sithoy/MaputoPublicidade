'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { formatMZN } from '@/lib/utils';

type InvoiceTermsCardProps = {
  issueDate: string;
  dueDate: string;
  discount: string;
  taxRate: string;
  notes: string;
  terms: string;
  subtotal: number;
  idPrefix?: string;
  onIssueDateChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
  onTaxRateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onTermsChange: (value: string) => void;
};

export function InvoiceTermsCard({
  issueDate,
  dueDate,
  discount,
  taxRate,
  notes,
  terms,
  subtotal,
  idPrefix = 'invoice',
  onIssueDateChange,
  onDueDateChange,
  onDiscountChange,
  onTaxRateChange,
  onNotesChange,
  onTermsChange,
}: InvoiceTermsCardProps) {
  const discountAmount = Number(discount) || 0;
  const taxable = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxable * (Number(taxRate) || 0) / 100;
  const total = taxable + taxAmount;

  return (
    <Card className="border-[#dce6df] shadow-[0_12px_34px_-26px_rgba(6,63,43,0.35)]">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-dark">Condições financeiras</h2>
            <p className="text-sm text-gray-500">
              Defina datas, desconto, impostos e condições apresentadas no documento.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Faturação
          </span>
        </div>

        <div className="grid gap-5 rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor={`${idPrefix}-issue-date`}>Data de emissão *</Label>
            <Input
              id={`${idPrefix}-issue-date`}
              type="date"
              required
              value={issueDate}
              onChange={(event) => onIssueDateChange(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-due-date`}>Vencimento *</Label>
            <Input
              id={`${idPrefix}-due-date`}
              type="date"
              required
              min={issueDate}
              value={dueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-discount`}>Desconto (MZN)</Label>
            <Input
              id={`${idPrefix}-discount`}
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => onDiscountChange(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-tax-rate`}>IVA (%)</Label>
            <Input
              id={`${idPrefix}-tax-rate`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(event) => onTaxRateChange(event.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-[#e1e8e3] bg-[#f8faf8] p-5 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Subtotal</p>
            <p className="mt-1 font-semibold text-dark">{formatMZN(subtotal)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Desconto</p>
            <p className="mt-1 font-semibold text-dark">- {formatMZN(discountAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">IVA</p>
            <p className="mt-1 font-semibold text-dark">{formatMZN(taxAmount)}</p>
          </div>
          <div className="rounded-xl bg-primary px-4 py-3 text-white sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-white/75">Total</p>
            <p className="mt-1 text-lg font-bold">{formatMZN(total)}</p>
          </div>
        </div>

        <div className="grid gap-5 border-t border-[#e1e8e3] pt-5 lg:grid-cols-2">
          <div>
            <Label htmlFor={`${idPrefix}-notes`}>Observações</Label>
            <Textarea
              id={`${idPrefix}-notes`}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="Informações adicionais visíveis na fatura."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-terms`}>Condições de pagamento</Label>
            <Textarea
              id={`${idPrefix}-terms`}
              value={terms}
              onChange={(event) => onTermsChange(event.target.value)}
              rows={3}
              placeholder="Ex.: Pagamento por transferência bancária no prazo indicado."
              className="mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
