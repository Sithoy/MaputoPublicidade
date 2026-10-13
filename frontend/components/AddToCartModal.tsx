'use client';

import { useEffect, useRef, useState } from 'react';
import { ApparelMatrix } from './ApparelMatrix';
import type { ApparelDistribution } from '@/lib/apparel';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { addCartItem } from '@/lib/client-api';
import type { Product, ProductVariant } from '@/lib/api';
import { productTemplate, configurationSnapshot, type CatalogueConfiguration } from '@/lib/product-configuration';
import { ProductConfigurationFields } from './ProductConfigurationFields';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const apparelPending = product.order_template === 'apparel' && (!product.apparel_options?.models?.length || !product.apparel_options?.colors?.length || !product.apparel_options?.sizes?.length);
  const [apparel, setApparel] = useState<ApparelDistribution>({ pending: apparelPending, rows: [] });
  const [configuration, setConfiguration] = useState<CatalogueConfiguration | undefined>();
  const template = productTemplate(product);
  const configured = !['standard', 'apparel'].includes(template);
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
      setApparel({ pending: apparelPending, rows: [] });
      setConfiguration(undefined);
      setSize('');
      setMaterial('');
      setColors('');
      setNeedsDesign(false);
      setNotes('');
      setArtworkFile(null);
      setError('');
    }
  }, [open, product.id, product.min_quantity, apparelPending]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]') || []).filter(element => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [open]);

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
        ...(product.order_template === 'apparel' ? { material_briefing: { work_type: 'apparel' as const, apparel } } : {}),
        ...(configured ? { material_briefing: { catalogue_configuration: configuration || configurationSnapshot(product, {}) } } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar ao carrinho');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-900/60 p-3 backdrop-blur-sm sm:p-6">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="product-order-title" tabIndex={-1} className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-[#DCE5DE] bg-light p-6 shadow-2xl outline-none sm:p-8 ${product.order_template === 'apparel' ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="product-order-title" className="text-2xl font-bold tracking-tight text-brand-800">Dê-lhe a sua identidade.</h2>
          <button type="button" aria-label="Fechar personalização" onClick={onClose} className="rounded-full bg-white p-2 text-[#66736D] hover:text-brand-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 text-sm font-semibold text-brand-800">
          {product.name}
          {variant ? ` — ${variant.name}` : ''}
        </p>
        <p className="mb-6 text-sm leading-6 text-[#66736D]">Indique o que precisa. A equipa confirma os detalhes na proposta antes de iniciar a produção.</p>

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

          {product.order_template === 'apparel' && product.apparel_options && <ApparelMatrix id="catalogue-apparel" options={product.apparel_options} quantity={quantity} value={apparel} onChange={setApparel} />}

          {configured ? <div className="space-y-4"><ProductConfigurationFields product={product} id="catalogue-configuration" value={configuration} onChange={setConfiguration} /><p className="text-xs leading-5 text-slate-500">Se precisar de outra dimensão ou especificação, explique nas observações. A equipa confirma a viabilidade na proposta.</p></div> : null}
          <div hidden={product.order_template === 'apparel' || configured}>
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

          <div hidden={configured}>
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

          <div hidden={product.order_template === 'apparel' || configured}>
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
              {loading ? 'A adicionar...' : 'Guardar no carrinho'}
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
