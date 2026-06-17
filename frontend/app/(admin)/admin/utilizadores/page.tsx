'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit, Search, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/admin/DataTable';
import { getUsers, toggleUserActive, toggleUserStaff } from '@/lib/admin-api';
import type { User } from '@/lib/api';

export default function AdminUsersPage() {
  const { loading: authLoading } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    loadUsers();
  }, [authLoading]);

  useEffect(() => {
    let data = [...users];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.first_name?.toLowerCase().includes(term) ||
          u.last_name?.toLowerCase().includes(term) ||
          u.profile?.company?.toLowerCase().includes(term)
      );
    }
    setFiltered(data);
  }, [users, search]);

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
      setFiltered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar utilizadores');
    }
  }

  async function toggleStaff(id: number) {
    try {
      await toggleUserStaff(id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function toggleActive(id: number) {
    try {
      await toggleUserActive(id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
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
        <h1 className="text-2xl font-bold text-dark">Utilizadores</h1>
        <p className="text-sm text-gray-500">Gerir contas e perfis de clientes</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar por nome, e-mail ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Nome',
            render: (item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email,
          },
          { key: 'email', header: 'E-mail' },
          {
            key: 'company',
            header: 'Empresa',
            render: (item) => item.profile?.company || '-',
          },
          {
            key: 'phone',
            header: 'Telefone',
            render: (item) => item.profile?.phone || '-',
          },
          {
            key: 'is_staff',
            header: 'Staff',
            render: (item) =>
              item.is_staff ? (
                <Shield className="h-5 w-5 text-brand" />
              ) : (
                <ShieldOff className="h-5 w-5 text-gray-300" />
              ),
          },
          {
            key: 'is_active',
            header: 'Activo',
            render: (item) =>
              item.is_active ? (
                <UserCheck className="h-5 w-5 text-green-600" />
              ) : (
                <UserX className="h-5 w-5 text-red-500" />
              ),
          },
        ]}
        data={filtered}
        actions={(item) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toggleStaff(item.id)}>
              {item.is_staff ? 'Remover staff' : 'Tornar staff'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleActive(item.id)}>
              {item.is_active ? 'Desactivar' : 'Activar'}
            </Button>
            <Link href={`/admin/utilizadores/${item.id}`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      />
    </div>
  );
}
