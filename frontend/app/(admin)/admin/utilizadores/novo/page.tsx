'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getApiErrorMessage } from '@/lib/api-errors';
import { createUser } from '@/lib/admin-api';
import { hasCapability, STAFF_ROLE_OPTIONS } from '@/lib/rbac';

export default function NewAdminUserPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAdminAuth();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const canManageStaff = hasCapability(currentUser, 'staff.manage');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const passwordConfirm = String(form.get('password_confirm') || '');
    const selectedRole = String(form.get('role') || 'client');

    try {
      const created = await createUser({
        email: String(form.get('email') || '').trim(),
        first_name: String(form.get('first_name') || '').trim(),
        last_name: String(form.get('last_name') || '').trim(),
        is_staff: canManageStaff && selectedRole !== 'client',
        staff_role:
          canManageStaff && selectedRole !== 'client'
            ? (selectedRole as 'administrator' | 'commercial' | 'production' | 'finance' | 'content')
            : '',
        is_active: form.get('is_active') === 'on',
        password,
        password_confirm: passwordConfirm,
        profile: {
          company: String(form.get('company') || '').trim(),
          phone: String(form.get('phone') || '').trim(),
          nuit: String(form.get('nuit') || '').trim(),
          address: String(form.get('address') || '').trim(),
          billing_address: String(form.get('billing_address') || '').trim(),
        },
      });
      router.push(`/admin/utilizadores/${created.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar o utilizador.'));
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <p className="text-sm text-[#6a7971]">A preparar o formulário...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Nova conta
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-dark">
            Adicionar utilizador
          </h1>
          <p className="mt-1 text-sm text-[#6a7971]">
            Crie o acesso e registe os dados essenciais do cliente ou membro da equipa.
          </p>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-[#edf1ee] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-dark">Identificação e acesso</h2>
                <p className="text-xs text-[#829087]">Dados usados para entrar na plataforma.</p>
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
                  required
                  placeholder="nome@empresa.co.mz"
                  className="h-11 rounded-xl border-[#cbd8d0]"
                />
              </div>
              <div>
                <Label htmlFor="first_name">Primeiro nome</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  autoComplete="given-name"
                  className="h-11 rounded-xl border-[#cbd8d0]"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Apelido</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  autoComplete="family-name"
                  className="h-11 rounded-xl border-[#cbd8d0]"
                />
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                {canManageStaff ? (
                  <Select
                    id="role"
                    name="role"
                    defaultValue="client"
                    className="h-11 rounded-xl border-[#cbd8d0]"
                  >
                    <option value="client">Cliente</option>
                    {STAFF_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="flex h-11 items-center rounded-xl border border-[#dfe7e1] bg-[#f7f9f7] px-3 text-sm text-[#56665d]">
                    Cliente
                  </div>
                )}
              </div>
              <div className="flex items-end">
                <label className="flex h-11 w-full items-center justify-between rounded-xl border border-[#dfe7e1] bg-[#f7f9f7] px-3 text-sm font-medium text-dark">
                  Conta activa
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </label>
              </div>
            </div>
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
                <p className="text-xs text-[#829087]">Informação de contacto e facturação.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="company">Empresa</Label>
                <Input id="company" name="company" className="h-11 rounded-xl border-[#cbd8d0]" />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+258 84 000 0000"
                  className="h-11 rounded-xl border-[#cbd8d0]"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="nuit">NUIT</Label>
                <Input id="nuit" name="nuit" className="h-11 rounded-xl border-[#cbd8d0]" />
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  name="address"
                  rows={3}
                  autoComplete="street-address"
                  className="resize-none rounded-xl border-[#cbd8d0]"
                />
              </div>
              <div>
                <Label htmlFor="billing_address">Endereço de facturação</Label>
                <Textarea
                  id="billing_address"
                  name="billing_address"
                  rows={3}
                  className="resize-none rounded-xl border-[#cbd8d0]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#dfe7e1] shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-[#edf1ee] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-dark">Palavra-passe temporária</h2>
                <p className="text-xs text-[#829087]">
                  Use pelo menos 8 caracteres e partilhe-a de forma segura.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="password">Palavra-passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="password_confirm">Confirmar palavra-passe</Label>
                <Input
                  id="password_confirm"
                  name="password_confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-11 rounded-xl border-[#cbd8d0]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/utilizadores')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {canManageStaff ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'A criar conta...' : 'Criar utilizador'}
          </Button>
        </div>
      </form>
    </div>
  );
}
