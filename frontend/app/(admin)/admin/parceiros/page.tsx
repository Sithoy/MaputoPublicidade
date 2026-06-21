'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit, Plus, Search, Star, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { deletePartner, getPartners, updatePartner } from '@/lib/admin-api';
import type { Partner } from '@/lib/api';

function LogoCell({ partner }: { partner: Partner }) {
  if (partner.logo) {
    return (
      <div className="flex h-12 w-20 items-center justify-center rounded-md border border-gray-100 bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-20 items-center justify-center rounded-md bg-brand/10 text-sm font-bold text-brand">
      {partner.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function AdminPartnersPage() {
  const { loading: authLoading } = useAdminAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filtered, setFiltered] = useState<Partner[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadPartners();
  }, [authLoading]);

  useEffect(() => {
    let data = [...partners];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (partner) =>
          partner.name.toLowerCase().includes(term) ||
          partner.sector?.toLowerCase().includes(term) ||
          partner.website?.toLowerCase().includes(term)
      );
    }
    setFiltered(data);
  }, [partners, search]);

  async function loadPartners() {
    try {
      const data = await getPartners();
      setPartners(data);
      setFiltered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar parceiros');
    }
  }

  async function toggleField(slug: string, field: 'is_active' | 'is_featured', value: boolean) {
    try {
      const formData = new FormData();
      formData.append(field, value ? 'true' : 'false');
      await updatePartner(slug, formData);
      await loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar parceiro');
    }
  }

  async function handleDelete() {
    if (!deleteSlug) return;
    try {
      await deletePartner(deleteSlug);
      await loadPartners();
      setDeleteSlug(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar parceiro');
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
          <h1 className="text-2xl font-bold text-dark">Parceiros</h1>
          <p className="text-sm text-gray-500">Gerir empresas apresentadas em Nossos parceiros</p>
        </div>
        <Link href="/admin/parceiros/novo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo parceiro
          </Button>
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar parceiro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          { key: 'logo', header: 'Logo', render: (partner) => <LogoCell partner={partner} /> },
          { key: 'name', header: 'Empresa' },
          { key: 'sector', header: 'Sector', render: (partner) => partner.sector || '-' },
          { key: 'display_order', header: 'Ordem', render: (partner) => partner.display_order ?? 0 },
          {
            key: 'is_active',
            header: 'Activo',
            render: (partner) => (
              <button onClick={() => toggleField(partner.slug, 'is_active', !partner.is_active)}>
                {partner.is_active ? (
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
            render: (partner) => (
              <button onClick={() => toggleField(partner.slug, 'is_featured', !partner.is_featured)}>
                <Star
                  className={`h-5 w-5 ${partner.is_featured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              </button>
            ),
          },
        ]}
        data={filtered}
        actions={(partner) => (
          <div className="flex items-center gap-2">
            <Link href={`/admin/parceiros/${partner.slug}/editar`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:bg-red-50"
              onClick={() => setDeleteSlug(partner.slug)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!deleteSlug}
        title="Eliminar parceiro"
        message="Tem a certeza que deseja eliminar este parceiro? Esta acção não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteSlug(null)}
        destructive
      />
    </div>
  );
}
