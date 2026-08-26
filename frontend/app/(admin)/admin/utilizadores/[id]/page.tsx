'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Save,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getApiErrorMessage } from '@/lib/api-errors';
import { getUser, setUserPassword, updateUser } from '@/lib/admin-api';
import type { User } from '@/lib/api';
import { getRoleLabel, hasCapability, STAFF_ROLE_OPTIONS } from '@/lib/rbac';

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

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return 'Nunca';
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAdminAuth();
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (authLoading || !id) return;
    const userId = Number(id);
    if (!Number.isInteger(userId)) {
      setError('O identificador do utilizador é inválido.');
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    setInitialLoading(true);
    getUser(userId)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Não foi possível carregar este utilizador.'));
        }
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setMessage('');

    const form = new FormData(event.currentTarget);
    const canChangeRole =
      hasCapability(currentUser, 'staff.manage') && !user.is_superuser && currentUser?.id !== user.id;
    const canChangeStatus =
      currentUser?.id !== user.id &&
      (!user.is_staff || hasCapability(currentUser, 'staff.manage'));
    const selectedRole = String(form.get('role') || user.role || 'client');

    try {
      const updated = await updateUser(user.id, {
        email: String(form.get('email') || '').trim(),
        first_name: String(form.get('first_name') || '').trim(),
        last_name: String(form.get('last_name') || '').trim(),
        is_staff: canChangeRole ? selectedRole !== 'client' : user.is_staff,
        staff_role:
          canChangeRole && selectedRole !== 'client'
            ? (selectedRole as 'administrator' | 'commercial' | 'production' | 'finance' | 'content')
            : undefined,
        is_active: canChangeStatus ? form.get('is_active') === 'on' : user.is_active,
        profile: {
          company: String(form.get('company') || '').trim(),
          phone: String(form.get('phone') || '').trim(),
          nuit: String(form.get('nuit') || '').trim(),
          address: String(form.get('address') || '').trim(),
          billing_address: String(form.get('billing_address') || '').trim(),
        },
      });
      setUser(updated);
      setMessage('Dados do utilizador actualizados com sucesso.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível actualizar o utilizador.'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMessage('');

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await setUserPassword(user.id, {
        new_password: String(form.get('new_password') || ''),
        confirm_password: String(form.get('confirm_password') || ''),
      });
      formElement.reset();
      setPasswordMessage('Palavra-passe redefinida com sucesso.');
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, 'Não foi possível redefinir a palavra-passe.'));
    } finally {
      setPasswordSaving(false);
    }
  }

  if (authLoading || initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <p className="text-sm text-[#6a7971]">A carregar utilizador...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">Não foi possível abrir este utilizador.</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={() => router.push('/admin/utilizadores')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos utilizadores
        </Button>
      </div>
    );
  }

  const canEditProfile =
    !user.is_staff || hasCapability(currentUser, 'staff.manage') || currentUser?.id === user.id;
  const canChangeRole =
    hasCapability(currentUser, 'staff.manage') && !user.is_superuser && currentUser?.id !== user.id;
  const canChangeStatus =
    currentUser?.id !== user.id &&
    (!user.is_staff || hasCapability(currentUser, 'staff.manage'));
  const canResetPassword =
    !user.is_staff || hasCapability(currentUser, 'staff.manage') || currentUser?.id === user.id;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/utilizadores')}
            aria-label="Voltar à lista de utilizadores"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-800 text-sm font-bold tracking-[0.05em] text-white">
              {initials(user)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-dark">
                  {displayName(user)}
                </h1>
                <Badge variant={user.is_staff ? 'default' : 'outline'}>{getRoleLabel(user)}</Badge>
              </div>
              <p className="mt-0.5 truncate text-sm text-[#6a7971]">{user.email}</p>
            </div>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}
          />
          {user.is_active ? 'Conta activa' : 'Conta inactiva'}
        </span>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {message ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          role="status"
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Registado em', value: formatDate(user.date_joined), icon: CalendarDays },
          { label: 'Último acesso', value: formatDate(user.last_login, true), icon: Clock3 },
          { label: 'Encomendas', value: String(user.order_count ?? 0), icon: ShoppingBag },
          { label: 'Orçamentos', value: String(user.quote_count ?? 0), icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-2xl border-[#dfe7e1]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#829087]">{label}</p>
                <p className="truncate text-sm font-semibold text-dark">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-[#edf1ee] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-dark">Conta</h2>
                  <p className="text-xs text-[#829087]">Identidade, função e acesso.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={user.email}
                    required
                    disabled={!canEditProfile}
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <div>
                  <Label htmlFor="first_name">Primeiro nome</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    defaultValue={user.first_name}
                    disabled={!canEditProfile}
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Apelido</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    defaultValue={user.last_name}
                    disabled={!canEditProfile}
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select
                    id="role"
                    name="role"
                    defaultValue={user.role || (user.is_staff ? 'administrator' : 'client')}
                    disabled={!canChangeRole}
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  >
                    {user.is_superuser ? <option value="owner">Proprietário</option> : null}
                    <option value="client">Cliente</option>
                    {STAFF_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex h-11 w-full items-center justify-between rounded-xl border border-[#dfe7e1] bg-[#f7f9f7] px-3 text-sm font-medium text-dark">
                    Conta activa
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={user.is_active}
                      disabled={!canChangeStatus}
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50"
                    />
                  </label>
                </div>
              </div>
              {!canEditProfile ? (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Apenas o proprietário pode alterar outra conta administrativa.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-[#edf1ee] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-dark">Perfil comercial</h2>
                  <p className="text-xs text-[#829087]">Contacto e dados de facturação.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    name="company"
                    defaultValue={user.profile?.company}
                    disabled={!canEditProfile}
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={user.profile?.phone}
                    disabled={!canEditProfile}
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="nuit">NUIT</Label>
                  <Input
                    id="nuit"
                    name="nuit"
                    defaultValue={user.profile?.nuit}
                    disabled={!canEditProfile}
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    name="address"
                    rows={3}
                    defaultValue={user.profile?.address}
                    disabled={!canEditProfile}
                    className="resize-none rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <div>
                  <Label htmlFor="billing_address">Endereço de facturação</Label>
                  <Textarea
                    id="billing_address"
                    name="billing_address"
                    rows={3}
                    defaultValue={user.profile?.billing_address}
                    disabled={!canEditProfile}
                    className="resize-none rounded-xl border-[#cbd8d0]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {canEditProfile ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'A guardar...' : 'Guardar alterações'}
            </Button>
          </div>
        ) : null}
      </form>

      <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 border-b border-[#edf1ee] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-dark">Segurança</h2>
              <p className="text-xs text-[#829087]">
                Defina uma nova palavra-passe temporária para esta conta.
              </p>
            </div>
          </div>

          {canResetPassword ? (
            <form onSubmit={handlePasswordSubmit} className="mt-5">
              {passwordError ? (
                <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {passwordError}
                </p>
              ) : null}
              {passwordMessage ? (
                <p
                  className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                  role="status"
                >
                  {passwordMessage}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <Label htmlFor="new_password">Nova palavra-passe</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      name="new_password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="h-11 rounded-xl border-[#cbd8d0] pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#829087] hover:text-dark"
                      aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirmar palavra-passe</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  />
                </div>
                <Button type="submit" disabled={passwordSaving} className="h-11 gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  {passwordSaving ? 'A redefinir...' : 'Redefinir'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Apenas o proprietário pode redefinir a palavra-passe de outro administrador.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
