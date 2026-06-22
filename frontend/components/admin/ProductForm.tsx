'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { createVariant, deleteVariant, updateVariant } from '@/lib/admin-api';
import type { Category, Product, ProductVariant } from '@/lib/api';

type VariantDraft = {
  id?: number;
  name: string;
  sku: string;
  price: string;
  image?: string;
  imageFile: File | null;
  imageRemoved: boolean;
  is_active: boolean;
  position: number;
};

function variantToDraft(v: ProductVariant, position: number): VariantDraft {
  return {
    id: v.id,
    name: v.name,
    sku: v.sku || '',
    price: v.price?.toString() || '',
    image: v.image,
    imageFile: null,
    imageRemoved: false,
    is_active: v.is_active ?? true,
    position: v.position ?? position,
  };
}

function emptyVariant(position: number): VariantDraft {
  return {
    name: '',
    sku: '',
    price: '',
    imageFile: null,
    imageRemoved: false,
    is_active: true,
    position,
  };
}

export function ProductForm({
  product,
  categories,
  onSubmit,
  loading,
  error,
}: {
  product?: Product | null;
  categories: Category[];
  onSubmit: (formData: FormData) => Promise<Product>;
  loading: boolean;
  error: string;
}) {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variantError, setVariantError] = useState('');
  const [isSavingVariants, setIsSavingVariants] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    const existing = product?.variants ?? [];
    if (existing.length > 0) {
      return existing.map((v, i) => variantToDraft(v, i));
    }
    return [];
  });

  const initialVariantIds = useMemo(
    () => new Set((product?.variants ?? []).map((v) => v.id)),
    [product]
  );

  useEffect(() => {
    if (product?.image) setImageFile(null);
  }, [product]);

  function updateVariantField(index: number, field: keyof VariantDraft, value: unknown) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant(prev.length)]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function syncVariants(productId: number) {
    const currentIds = new Set<number>();
    for (const v of variants) {
      if (v.id) currentIds.add(v.id);
    }

    const removedIds = Array.from(initialVariantIds).filter((id) => !currentIds.has(id));

    for (const id of removedIds) {
      await deleteVariant(id);
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const formData = new FormData();
      formData.append('product', productId.toString());
      formData.append('name', v.name.trim());
      formData.append('sku', v.sku.trim());
      formData.append('price', v.price);
      formData.append('is_active', v.is_active ? 'true' : 'false');
      formData.append('position', String(i));
      if (v.imageFile) {
        formData.append('image', v.imageFile);
      }

      if (v.id) {
        await updateVariant(v.id, formData);
      } else {
        await createVariant(formData);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVariantError('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    const materials = (formData.get('materials') as string)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const sizes = (formData.get('sizes') as string)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    formData.set('materials', JSON.stringify(materials));
    formData.set('sizes', JSON.stringify(sizes));

    const isFeatured = form.querySelector<HTMLInputElement>("input[name='is_featured']")?.checked ?? false;
    const isActive = form.querySelector<HTMLInputElement>("input[name='is_active']")?.checked ?? true;
    formData.set('is_featured', isFeatured ? 'true' : 'false');
    formData.set('is_active', isActive ? 'true' : 'false');

    if (imageFile) {
      formData.set('image', imageFile);
    } else if (!product?.image) {
      formData.delete('image');
    }

    try {
      const saved = await onSubmit(formData);
      if (saved.id && (variants.length > 0 || initialVariantIds.size > 0)) {
        setIsSavingVariants(true);
        await syncVariants(saved.id);
      }
      router.push('/admin/produtos');
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : 'Erro ao guardar variantes');
    } finally {
      setIsSavingVariants(false);
    }
  }

  const isBusy = loading || isSavingVariants;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {(error || variantError) && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || variantError}</div>
      )}

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome do produto</Label>
            <Input id="name" name="name" defaultValue={product?.name} required className="mt-1" />
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={product?.slug} required className="mt-1" />
          </div>

          <div>
            <Label htmlFor="category_id">Categoria</Label>
            <Select
              id="category_id"
              name="category_id"
              defaultValue={product?.category_id?.toString() || ''}
              className="mt-1"
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="materials">Materiais (separados por vírgula)</Label>
            <Input
              id="materials"
              name="materials"
              defaultValue={product?.materials?.join(', ')}
              placeholder="Algodão, Poliéster"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="sizes">Tamanhos (separados por vírgula)</Label>
            <Input
              id="sizes"
              name="sizes"
              defaultValue={product?.sizes?.join(', ')}
              placeholder="A4, A3, M"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="min_quantity">Quantidade mínima</Label>
            <Input
              id="min_quantity"
              name="min_quantity"
              type="number"
              defaultValue={product?.min_quantity || 1}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="lead_time">Prazo estimado</Label>
            <Input
              id="lead_time"
              name="lead_time"
              defaultValue={product?.lead_time}
              placeholder="3-5 dias úteis"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="base_price">Preço base (MZN)</Label>
            <Input
              id="base_price"
              name="base_price"
              type="number"
              step="0.01"
              defaultValue={product?.base_price}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pricing_complexity">Tipo de precificação</Label>
            <Select
              id="pricing_complexity"
              name="pricing_complexity"
              defaultValue={product?.pricing_complexity || 'simple'}
              className="mt-1"
            >
              <option value="simple">Simples</option>
              <option value="complex">Complexo (requer orçamento)</option>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label>Imagem</Label>
            <div className="mt-1">
              <ImageUploader
                name="image"
                preview={product?.image || null}
                frame="landscape"
                onChange={setImageFile}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-dark">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={product?.is_featured}
                className="h-4 w-4 rounded border-gray-300 text-brand"
              />
              Em destaque
            </label>
            <label className="flex items-center gap-2 text-sm text-dark">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={product?.is_active ?? true}
                className="h-4 w-4 rounded border-gray-300 text-brand"
              />
              Activo
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-dark">Variantes</h3>
              <p className="text-sm text-gray-500">
                Cada variante pode ter um preço e imagem próprios.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addVariant} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar variante
            </Button>
          </div>

          {variants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Sem variantes. O produto usará o preço base e a imagem acima.
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div
                  key={variant.id ?? `new-${index}`}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Variante {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Remover variante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`variant-name-${index}`}>Nome</Label>
                      <Input
                        id={`variant-name-${index}`}
                        value={variant.name}
                        onChange={(e) => updateVariantField(index, 'name', e.target.value)}
                        placeholder="Ex: 2x1 m"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`variant-sku-${index}`}>SKU</Label>
                      <Input
                        id={`variant-sku-${index}`}
                        value={variant.sku}
                        onChange={(e) => updateVariantField(index, 'sku', e.target.value)}
                        placeholder="Opcional"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`variant-price-${index}`}>Preço (MZN)</Label>
                      <Input
                        id={`variant-price-${index}`}
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => updateVariantField(index, 'price', e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div className="flex items-end gap-4">
                      <label className="flex items-center gap-2 pb-2 text-sm text-dark">
                        <input
                          type="checkbox"
                          checked={variant.is_active}
                          onChange={(e) => updateVariantField(index, 'is_active', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-brand"
                        />
                        Activo
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <Label>Imagem da variante</Label>
                      <div className="mt-1">
                        <ImageUploader
                          name=""
                          preview={variant.imageRemoved ? null : variant.image || null}
                          frame="landscape"
                          onChange={(file) => updateVariantField(index, 'imageFile', file)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isBusy} className="gap-2">
          <Save className="h-4 w-4" />
          {isBusy ? 'A guardar...' : 'Guardar produto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/produtos')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
