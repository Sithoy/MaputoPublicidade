'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { getUser, updateUser } from '@/lib/admin-api';
import type { User } from '@/lib/api';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading || !id) return;
    getUser(parseInt(id, 10))
      .then(setUser)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar utilizador'));
  }, [authLoading, id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    setError('');
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      is_staff: formData.get('is_staff') === 'on',
      is_active: formData.get('is_active') === 'on',
      profile: {
        company: formData.get('company') as string,
        phone: formData.get('phone') as string,
        nuit: formData.get('nuit') as string,
        address: formData.get('address') as string,
      },
    };

    try {
      await updateUser(parseInt(id, 10), data);
      setMessage('Utilizador actualizado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar utilizador');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/utilizadores')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-dark">Editar utilizador</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" defaultValue={user.email} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="first_name">Primeiro nome</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={user.first_name}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Apelido</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={user.last_name}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                name="company"
                defaultValue={user.profile?.company}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={user.profile?.phone}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="nuit">NUIT</Label>
              <Input id="nuit" name="nuit" defaultValue={user.profile?.nuit} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                name="address"
                defaultValue={user.profile?.address}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-dark">
                <input
                  type="checkbox"
                  name="is_staff"
                  defaultChecked={user.is_staff}
                  className="h-4 w-4 rounded border-gray-300 text-brand"
                />
                Staff
              </label>
              <label className="flex items-center gap-2 text-sm text-dark">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={user.is_active}
                  className="h-4 w-4 rounded border-gray-300 text-brand"
                />
                Activo
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? 'A guardar...' : 'Guardar utilizador'}
          </Button>
        </div>
      </form>
    </div>
  );
}
