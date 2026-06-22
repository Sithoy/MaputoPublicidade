'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ImageUploader } from '@/components/admin/ImageUploader';
import type { Category, Product } from '@/lib/api';

export function ProductForm({
  product,
  categories,
  onSubmit,
  loading,
  error,
}: {
  product?: Product | null;
  categories: Category[];
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  error: string;
}) {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (product?.image) setImageFile(null);
  }, [product]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome do produto</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={product?.slug}
              required
              className="mt-1"
            />
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
                frame="portrait"
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

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'A guardar...' : 'Guardar produto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/produtos')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
