'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ImageUploader } from '@/components/admin/ImageUploader';
import type { Category, PortfolioItem } from '@/lib/api';

export function PortfolioForm({
  item,
  categories,
  onSubmit,
  loading,
  error,
}: {
  item?: PortfolioItem | null;
  categories: Category[];
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  error: string;
}) {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const isFeatured = form.querySelector<HTMLInputElement>("input[name='is_featured']")?.checked ?? false;
    const isActive = form.querySelector<HTMLInputElement>("input[name='is_active']")?.checked ?? true;
    formData.set('is_featured', isFeatured ? 'true' : 'false');
    formData.set('is_active', isActive ? 'true' : 'false');

    const category = formData.get('category') as string;
    if (!category) {
      formData.delete('category');
    }

    const slug = (formData.get('slug') as string)?.trim();
    if (!slug) {
      formData.delete('slug');
    }

    if (imageFile) {
      formData.set('image', imageFile);
    } else if (!item?.image) {
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
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              defaultValue={item?.title}
              required
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={item?.slug}
              placeholder="gerado automaticamente se vazio"
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              id="category"
              name="category"
              defaultValue={item?.category?.toString() || ''}
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
              defaultValue={item?.description}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="client_name">Cliente</Label>
            <Input
              id="client_name"
              name="client_name"
              defaultValue={item?.client_name}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="completion_date">Data de conclusão</Label>
            <Input
              id="completion_date"
              name="completion_date"
              type="date"
              defaultValue={item?.completion_date}
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Imagem</Label>
            <div className="mt-1">
              <ImageUploader
                name="image"
                preview={item?.image || null}
                onChange={setImageFile}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-dark">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={item?.is_featured}
                className="h-4 w-4 rounded border-gray-300 text-brand"
              />
              Em destaque
            </label>
            <label className="flex items-center gap-2 text-sm text-dark">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={item?.is_active ?? true}
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
          {loading ? 'A guardar...' : 'Guardar item'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/portfolio')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
