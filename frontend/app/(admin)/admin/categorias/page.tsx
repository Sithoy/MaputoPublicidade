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
import { createCategory, deleteCategory, getCategories, updateCategory } from '@/lib/admin-api';
import type { Category } from '@/lib/api';

export default function AdminCategoriesPage() {
  const { loading: authLoading } = useAdminAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadCategories();
  }, [authLoading]);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const isActive = form.querySelector<HTMLInputElement>("input[name='is_active']")?.checked ?? true;
    formData.set('is_active', isActive ? 'true' : 'false');

    if (categoryImage) {
      formData.set('image', categoryImage);
    } else if (!editing?.image) {
      formData.delete('image');
    }

    try {
      if (editing) {
        await updateCategory(editing.slug, formData);
      } else {
        await createCategory(formData);
      }
      setEditing(null);
      form.reset();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar categoria');
    }
  }

  async function handleDelete() {
    if (!deleteSlug) return;
    try {
      await deleteCategory(deleteSlug);
      await loadCategories();
      setDeleteSlug(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar categoria');
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
        <h1 className="text-2xl font-bold text-dark">Categorias</h1>
        <p className="text-sm text-gray-500">Gerir categorias de serviços</p>
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
              <Label htmlFor="icon_name">Ícone</Label>
              <Input
                id="icon_name"
                name="icon_name"
                defaultValue={editing?.icon_name}
                placeholder="Printer"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Ordem</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editing?.display_order || 0}
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
              <Label>Imagem</Label>
              <div className="mt-1">
                <ImageUploader
                  name="image"
                  preview={editing?.image || null}
                  onChange={setCategoryImage}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
              <label className="flex items-center gap-2 text-sm text-dark">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing ? editing.is_active : true}
                  className="h-4 w-4 rounded border-gray-300 text-brand"
                />
                Activa
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
                    setCategoryImage(null);
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
          { key: 'icon_name', header: 'Ícone' },
          {
            key: 'is_active',
            header: 'Activa',
            render: (item) => (item.is_active ? 'Sim' : 'Não'),
          },
        ]}
        data={categories}
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
        title="Eliminar categoria"
        message="Tem a certeza que deseja eliminar esta categoria?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteSlug(null)}
        destructive
      />
    </div>
  );
}
