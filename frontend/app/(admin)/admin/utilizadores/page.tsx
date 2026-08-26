'use client';

import Link from 'next/link';
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Mail,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DataTable } from '@/components/admin/DataTable';
import { StatCard } from '@/components/admin/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  getUsers,
  getUserSummary,
  toggleUserActive,
  type UserSummary,
} from '@/lib/admin-api';
import type { User } from '@/lib/api';
import { getRoleLabel, hasCapability, STAFF_ROLE_OPTIONS } from '@/lib/rbac';

const PAGE_SIZE = 25;

function displayName(user: User) {
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
}

function initials(user: User) {
  return displayName(user)
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const { user: currentUser, loading: authLoading } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const requestId = useRef(0);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getUserSummary());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar o resumo de utilizadores.'));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const activeRequest = ++requestId.current;
    const params = new URLSearchParams({ page: String(page), ordering: '-date_joined' });
    if (deferredSearch) params.set('search', deferredSearch);
    if (role !== 'all') params.set('role', role);
    if (status !== 'all') params.set('is_active', status === 'active' ? 'true' : 'false');

    setLoading(true);
    setError('');
    try {
      const response = await getUsers(`?${params.toString()}`);
      if (activeRequest !== requestId.current) return;
      setUsers(response.results);
      setTotal(response.count);
    } catch (err) {
      if (activeRequest !== requestId.current) return;
      setError(getApiErrorMessage(err, 'Não foi possível carregar os utilizadores.'));
    } finally {
      if (activeRequest === requestId.current) setLoading(false);
    }
  }, [deferredSearch, page, role, status]);

  useEffect(() => {
    if (authLoading) return;
    void loadSummary();
  }, [authLoading, loadSummary]);

  useEffect(() => {
    if (authLoading) return;
    void loadUsers();
  }, [authLoading, loadUsers]);

  async function confirmStatusChange() {
    if (!pendingUser) return;
    setActionLoading(true);
    setError('');
    try {
      await toggleUserActive(pendingUser.id);
      setPendingUser(null);
      await Promise.all([loadUsers(), loadSummary()]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível alterar o estado desta conta.'));
    } finally {
      setActionLoading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <p className="text-sm text-[#6a7971]">A carregar utilizadores...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Acessos e clientes
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-dark">
            Gestão de utilizadores
          </h1>
          <p className="mt-1 text-sm text-[#6a7971]">
            Crie contas, organize permissões e mantenha os dados dos clientes actualizados.
          </p>
        </div>
        <Link
          href="/admin/utilizadores/novo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(8,114,71,0.75)] transition hover:-translate-y-0.5 hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Novo utilizador
        </Link>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={summary?.total ?? '—'} subtitle="Contas registadas" icon={Users} />
        <StatCard title="Clientes" value={summary?.clients ?? '—'} subtitle="Acesso ao portal" icon={Building2} />
        <StatCard title="Equipa MP" value={summary?.staff ?? '—'} subtitle="Acesso por função" icon={ShieldCheck} />
        <StatCard title="Contas activas" value={summary?.active ?? '—'} subtitle={`${summary?.inactive ?? 0} inactivas`} icon={UserCheck} />
      </div>

      <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_190px_190px]">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829087]" />
            <Input
              type="search"
              aria-label="Pesquisar utilizadores"
              placeholder="Pesquisar nome, e-mail ou empresa..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border-[#cbd8d0] pl-10"
            />
          </div>
          <Select
            aria-label="Filtrar por função"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border-[#cbd8d0]"
          >
            <option value="all">Todas as funções</option>
            <option value="client">Clientes</option>
            <option value="owner">Proprietário</option>
            {STAFF_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border-[#cbd8d0]"
          >
            <option value="all">Todos os estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          {
            key: 'identity',
            header: 'Utilizador',
            render: (item) => (
              <div className="flex min-w-[220px] items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-800">
                  {initials(item)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-dark">{displayName(item)}</p>
                  <p className="truncate text-xs text-[#829087]">{item.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'company',
            header: 'Empresa',
            render: (item) => (
              <div className="min-w-[150px]">
                <p className="font-medium text-[#405047]">
                  {item.profile?.company || 'Particular'}
                </p>
                <p className="mt-0.5 text-xs text-[#829087]">
                  {item.profile?.phone || 'Sem telefone'}
                </p>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'Função',
            render: (item) => (
              <Badge variant={item.is_staff ? 'default' : 'outline'}>{getRoleLabel(item)}</Badge>
            ),
          },
          {
            key: 'status',
            header: 'Estado',
            render: (item) => (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${item.is_active ? 'text-emerald-700' : 'text-red-600'}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
                {item.is_active ? 'Activo' : 'Inactivo'}
              </span>
            ),
          },
          {
            key: 'activity',
            header: 'Actividade',
            render: (item) => (
              <div className="min-w-[120px] text-xs text-[#6a7971]">
                <p>{item.order_count ?? 0} encomendas</p>
                <p>{item.quote_count ?? 0} orçamentos</p>
              </div>
            ),
          },
          {
            key: 'date_joined',
            header: 'Registo',
            render: (item) => (
              <span className="whitespace-nowrap text-xs">{formatDate(item.date_joined)}</span>
            ),
          },
        ]}
        data={users}
        emptyText={
          loading ? 'A carregar utilizadores...' : 'Nenhum utilizador corresponde aos filtros.'
        }
        actions={(item) => {
          const canChangeStatus =
            item.id !== currentUser?.id &&
            (!item.is_staff || hasCapability(currentUser, 'staff.manage'));
          return (
            <div className="flex min-w-[150px] items-center justify-end gap-2">
              {canChangeStatus ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title={item.is_active ? 'Desactivar conta' : 'Activar conta'}
                  aria-label={
                    item.is_active
                      ? `Desactivar ${displayName(item)}`
                      : `Activar ${displayName(item)}`
                  }
                  onClick={() => setPendingUser(item)}
                  className={item.is_active ? 'text-[#6a7971]' : 'text-emerald-700'}
                >
                  {item.is_active ? (
                    <UserX className="h-4 w-4" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
              <Link
                href={`/admin/utilizadores/${item.id}`}
                aria-label={`Editar ${displayName(item)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cbd8d0] bg-white px-3 text-xs font-semibold text-dark transition hover:border-brand/40 hover:bg-brand-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar
              </Link>
            </div>
          );
        }}
      />

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#dfe7e1] bg-white px-4 py-3 sm:flex-row">
        <p className="text-sm text-[#6a7971]">
          {total === 0
            ? 'Sem resultados'
            : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <span className="min-w-20 text-center text-xs font-semibold text-[#6a7971]">
            Página {page} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Seguinte
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingUser)}
        title={pendingUser?.is_active ? 'Desactivar utilizador?' : 'Activar utilizador?'}
        message={
          pendingUser
            ? pendingUser.is_active
              ? `${displayName(pendingUser)} deixará de conseguir entrar na plataforma.`
              : `${displayName(pendingUser)} voltará a ter acesso à plataforma.`
            : ''
        }
        confirmText={
          actionLoading ? 'A guardar...' : pendingUser?.is_active ? 'Desactivar' : 'Activar'
        }
        destructive={pendingUser?.is_active}
        onCancel={() => {
          if (!actionLoading) setPendingUser(null);
        }}
        onConfirm={() => void confirmStatusChange()}
      />
    </div>
  );
}
