'use client';

import { useEffect, useState } from 'react';
import { Edit, Plus, Save, Trash2, X } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { DataTable } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { createPackage, deletePackage, getPackages, updatePackage } from '@/lib/admin-api';
import type { Package } from '@/lib/api';

export default function AdminPackagesPage() {
  const { loading: authLoading } = useAdminAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Package | null>(null);
  const [packageImage, setPackageImage] = useState<File | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadPackages();
  }, [authLoading]);

  async function loadPackages() {
    try {
      const data = await getPackages();
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pacotes');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const items = (formData.get('items') as string)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    formData.set('items', JSON.stringify(items));

    const isRecurring = form.querySelector<HTMLInputElement>("input[name='is_recurring']")?.checked ?? false;
    const isActive = form.querySelector<HTMLInputElement>("input[name='is_active']")?.checked ?? true;
    formData.set('is_recurring', isRecurring ? 'true' : 'false');
    formData.set('is_active', isActive ? 'true' : 'false');

    if (packageImage) {
      formData.set('image', packageImage);
    } else if (!editing?.image) {
      formData.delete('image');
    }

    try {
      if (editing) {
        await updatePackage(editing.slug, formData);
      } else {
        await createPackage(formData);
      }
      setEditing(null);
      form.reset();
      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar pacote');
    }
  }

  async function handleDelete() {
    if (!deleteSlug) return;
    try {
      await deletePackage(deleteSlug);
      await loadPackages();
      setDeleteSlug(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar pacote');
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Pacotes</h1>
        <p className="text-sm text-gray-500">Gerir pacotes comerciais</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={editing?.slug}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="price">Preço (MZN)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                defaultValue={editing?.price}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="target_audience">Público-alvo</Label>
              <Input
                id="target_audience"
                name="target_audience"
                defaultValue={editing?.target_audience}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editing?.description}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Label htmlFor="items">Itens incluídos (separados por vírgula)</Label>
              <Input
                id="items"
                name="items"
                defaultValue={editing?.items?.join(', ')}
                placeholder="Rollup, 100 cartões, 50 folhetos"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Label>Imagem</Label>
              <div className="mt-1">
                <ImageUploader
                  name="image"
                  preview={editing?.image || null}
                  onChange={setPackageImage}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
              <label className="flex items-center gap-2 text-sm text-dark">
                <input
                  type="checkbox"
                  name="is_recurring"
                  defaultChecked={editing?.is_recurring}
                  className="h-4 w-4 rounded border-gray-300 text-brand"
                />
                Recorrente
              </label>
              <label className="flex items-center gap-2 text-sm text-dark">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing ? editing.is_active : true}
                  className="h-4 w-4 rounded border-gray-300 text-brand"
                />
                Activo
              </label>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                {editing ? 'Actualizar' : 'Adicionar'}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setPackageImage(null);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          { key: 'name', header: 'Nome' },
          { key: 'slug', header: 'Slug' },
          {
            key: 'price',
            header: 'Preço',
            render: (item) => `${item.price.toLocaleString()} MZN`,
          },
          {
            key: 'is_active',
            header: 'Activo',
            render: (item) => (item.is_active ? 'Sim' : 'Não'),
          },
        ]}
        data={packages}
        actions={(item) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(item)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setDeleteSlug(item.slug)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!deleteSlug}
        title="Eliminar pacote"
        message="Tem a certeza que deseja eliminar este pacote?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteSlug(null)}
        destructive
      />
    </div>
  );
}
