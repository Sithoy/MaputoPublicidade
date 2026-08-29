'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { Product } from '@/lib/api';
import { formatMZN } from '@/lib/utils';

export type EditableDocumentLine = {
  key: string;
  product_id?: number;
  description: string;
  quantity: string;
  unit_price: string;
};

export function newDocumentLine(): EditableDocumentLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: '',
    quantity: '1',
    unit_price: '',
  };
}

export function DocumentItemsEditor({
  lines,
  onChange,
  products,
  priceOptional = false,
}: {
  lines: EditableDocumentLine[];
  onChange: (lines: EditableDocumentLine[]) => void;
  products?: Product[];
  priceOptional?: boolean;
}) {
  function updateLine(key: string, patch: Partial<EditableDocumentLine>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function chooseProduct(line: EditableDocumentLine, productId: string) {
    const product = products?.find((item) => item.id === Number(productId));
    updateLine(line.key, {
      product_id: product?.id,
      description: product?.name ?? line.description,
      unit_price: product?.base_price?.toString() ?? line.unit_price,
    });
  }

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-dark">Itens do documento</h2>
          <p className="text-sm text-gray-500">Descreva claramente cada produto ou serviço.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => onChange([...lines, newDocumentLine()])}
        >
          <Plus className="h-4 w-4" />
          Adicionar item
        </Button>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={line.key}
            className="grid gap-3 rounded-2xl border border-[#e1e8e3] bg-[#f8faf8] p-4 lg:grid-cols-12"
          >
            {products ? (
              <div className="lg:col-span-3">
                <Label htmlFor={`product-${line.key}`}>Produto</Label>
                <select
                  id={`product-${line.key}`}
                  value={line.product_id ?? ''}
                  onChange={(event) => chooseProduct(line, event.target.value)}
                  className="mt-1 flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="">Item personalizado</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className={products ? 'lg:col-span-4' : 'lg:col-span-7'}>
              <Label htmlFor={`description-${line.key}`}>Descrição</Label>
              <Input
                id={`description-${line.key}`}
                value={line.description}
                onChange={(event) => updateLine(line.key, { description: event.target.value })}
                placeholder={`Item ${index + 1}`}
                className="mt-1"
              />
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor={`quantity-${line.key}`}>Quantidade</Label>
              <Input
                id={`quantity-${line.key}`}
                type="number"
                min="0.01"
                step="0.01"
                value={line.quantity}
                onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                className="mt-1"
              />
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor={`price-${line.key}`}>
                Preço unitário{priceOptional ? ' (opcional)' : ''}
              </Label>
              <Input
                id={`price-${line.key}`}
                type="number"
                min="0"
                step="0.01"
                value={line.unit_price}
                onChange={(event) => updateLine(line.key, { unit_price: event.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-end justify-between gap-3 lg:col-span-1 lg:flex-col lg:items-end">
              <span className="whitespace-nowrap text-sm font-semibold text-dark">
                {formatMZN((Number(line.quantity) || 0) * (Number(line.unit_price) || 0))}
              </span>
              <button
                type="button"
                aria-label={`Remover item ${index + 1}`}
                disabled={lines.length === 1}
                onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-[#e1e8e3] pt-4">
        <div className="flex min-w-64 items-center justify-between gap-8">
          <span className="text-sm font-medium text-gray-500">
            {priceOptional ? 'Subtotal conhecido' : 'Subtotal'}
          </span>
          <span className="text-lg font-bold text-dark">{formatMZN(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
