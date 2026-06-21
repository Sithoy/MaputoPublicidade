'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ImageUploader } from '@/components/admin/ImageUploader';
import type { Partner } from '@/lib/api';

export function PartnerForm({
  partner,
  onSubmit,
  loading,
  error,
}: {
  partner?: Partner | null;
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  error: string;
}) {
  const router = useRouter();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const isFeatured = form.querySelector<HTMLInputElement>("input[name='is_featured']")?.checked ?? false;
    const isActive = form.querySelector<HTMLInputElement>("input[name='is_active']")?.checked ?? true;
    formData.set('is_featured', isFeatured ? 'true' : 'false');
    formData.set('is_active', isActive ? 'true' : 'false');

    const slug = (formData.get('slug') as string)?.trim();
    if (!slug) formData.delete('slug');

    const displayOrder = (formData.get('display_order') as string)?.trim();
    if (!displayOrder) formData.set('display_order', '0');

    if (logoFile) {
      formData.set('logo', logoFile);
    } else if (!partner?.logo) {
      formData.delete('logo');
    }

    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Empresa</Label>
            <Input id="name" name="name" defaultValue={partner?.name} required className="mt-1" />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={partner?.slug}
              placeholder="gerado automaticamente se vazio"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="sector">Sector</Label>
            <Input
              id="sector"
              name="sector"
              defaultValue={partner?.sector}
              placeholder="Hotelaria, retalho, tecnologia..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={partner?.website}
              placeholder="https://empresa.co.mz"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="display_order">Ordem</Label>
            <Input
              id="display_order"
              name="display_order"
              type="number"
              min="0"
              defaultValue={partner?.display_order ?? 0}
              className="mt-1"
            />
          </div>

          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 pb-2 text-sm text-dark">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={partner?.is_featured}
                className="h-4 w-4 rounded border-gray-300 text-brand"
              />
              Em destaque
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-dark">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={partner?.is_active ?? true}
                className="h-4 w-4 rounded border-gray-300 text-brand"
              />
              Activo
            </label>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Nota interna ou contexto</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={partner?.description}
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Logotipo</Label>
            <p className="mt-1 text-xs text-gray-500">
              Use uma versão limpa do logotipo, de preferência em PNG com fundo transparente.
            </p>
            <div className="mt-3">
              <ImageUploader name="logo" preview={partner?.logo || null} onChange={setLogoFile} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'A guardar...' : 'Guardar parceiro'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/parceiros')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
