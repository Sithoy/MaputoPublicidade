'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { addCartItem } from '@/lib/client-api';
import type { Product, ProductVariant } from '@/lib/api';

export function AddToCartModal({
  product,
  variant,
  open,
  onClose,
}: {
  product: Product;
  variant?: ProductVariant | null;
  open: boolean;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');
  const [colors, setColors] = useState('');
  const [needsDesign, setNeedsDesign] = useState(false);
  const [notes, setNotes] = useState('');
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setQuantity(product.min_quantity || 1);
      setSize('');
      setMaterial('');
      setColors('');
      setNeedsDesign(false);
      setNotes('');
      setArtworkFile(null);
      setError('');
    }
  }, [open, product.min_quantity]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const description = variant ? `${product.name} — ${variant.name}` : product.name;
      await addCartItem({
        product_slug: product.slug,
        product_variant_id: variant?.id || null,
        description,
        quantity,
        size,
        material,
        colors,
        needs_design: needsDesign,
        notes,
        artwork_file: artworkFile,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar ao carrinho');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark">Adicionar ao carrinho</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          {product.name}
          {variant ? ` — ${variant.name}` : ''}
        </p>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="qty">Quantidade</Label>
            <Input
              id="qty"
              type="number"
              min={product.min_quantity || 1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(product.min_quantity || 1, Number(e.target.value)))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="size">Tamanho</Label>
            {product.sizes && product.sizes.length > 0 ? (
              <Select id="size" value={size} onChange={(e) => setSize(e.target.value)} className="mt-1">
                <option value="">Seleccionar</option>
                {product.sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            ) : (
              <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} className="mt-1" />
            )}
          </div>

          <div>
            <Label htmlFor="material">Material</Label>
            {product.materials && product.materials.length > 0 ? (
              <Select id="material" value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1">
                <option value="">Seleccionar</option>
                {product.materials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            ) : (
              <Input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1" />
            )}
          </div>

          <div>
            <Label htmlFor="colors">Cores</Label>
            <Input id="colors" value={colors} onChange={(e) => setColors(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="artwork">Ficheiro de arte / logotipo</Label>
            <Input
              id="artwork"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setArtworkFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={2} />
          </div>

          <label className="flex items-center gap-2 text-sm text-dark">
            <input
              type="checkbox"
              checked={needsDesign}
              onChange={(e) => setNeedsDesign(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand"
            />
            Precisa de design/arte da nossa equipa
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'A adicionar...' : 'Adicionar ao carrinho'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
