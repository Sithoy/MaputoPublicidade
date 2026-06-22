'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit, Plus, Search, Star, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { deleteProduct, getProducts, updateProduct } from '@/lib/admin-api';
import type { Product } from '@/lib/api';

export default function AdminProductsPage() {
  const { loading: authLoading } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadProducts();
  }, [authLoading]);

  useEffect(() => {
    let data = [...products];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term)
      );
    }
    setFiltered(data);
  }, [products, search]);

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
      setFiltered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    }
  }

  async function toggleField(slug: string, field: 'is_active' | 'is_featured', value: boolean) {
    try {
      const formData = new FormData();
      formData.append(field, value ? 'true' : 'false');
      await updateProduct(slug, formData);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar produto');
    }
  }

  async function handleDelete() {
    if (!deleteSlug) return;
    try {
      await deleteProduct(deleteSlug);
      await loadProducts();
      setDeleteSlug(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar produto');
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Produtos</h1>
          <p className="text-sm text-gray-500">Gerir catálogo de produtos</p>
        </div>
        <Link href="/admin/produtos/novo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          { key: 'name', header: 'Nome' },
          { key: 'category', header: 'Categoria' },
          {
            key: 'base_price',
            header: 'Preço',
            render: (item) => {
              const price = item.starting_price || item.base_price;
              const label = item.has_variants ? 'Desde ' : '';
              return price ? `${label}${price.toLocaleString()} MZN` : '-';
            },
          },
          {
            key: 'variants',
            header: 'Variantes',
            render: (item) => <span className="text-sm text-gray-600">{item.variants?.length || 0}</span>,
          },
          {
            key: 'is_active',
            header: 'Activo',
            render: (item) => (
              <button onClick={() => toggleField(item.slug, 'is_active', !item.is_active)}>
                {item.is_active ? (
                  <ToggleRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-400" />
                )}
              </button>
            ),
          },
          {
            key: 'is_featured',
            header: 'Destaque',
            render: (item) => (
              <button onClick={() => toggleField(item.slug, 'is_featured', !item.is_featured)}>
                <Star
                  className={`h-5 w-5 ${item.is_featured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              </button>
            ),
          },
        ]}
        data={filtered}
        actions={(item) => (
          <div className="flex items-center gap-2">
            <Link href={`/admin/produtos/${item.slug}/editar`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:bg-red-50"
              onClick={() => setDeleteSlug(item.slug)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!deleteSlug}
        title="Eliminar produto"
        message="Tem a certeza que deseja eliminar este produto? Esta acção não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteSlug(null)}
        destructive
      />
    </div>
  );
}
