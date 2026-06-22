'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { getMe, updateMe } from '@/lib/client-api';
import type { User as UserType } from '@/lib/api';

export default function ClientProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [nuit, setNuit] = useState('');
  const [address, setAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.profile?.phone || '');
        setCompany(data.profile?.company || '');
        setNuit(data.profile?.nuit || '');
        setAddress(data.profile?.address || '');
        setBillingAddress(data.profile?.billing_address || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar perfil'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateMe({
        first_name: firstName,
        last_name: lastName,
        profile: {
          phone,
          company,
          nuit,
          address,
          billing_address: billingAddress,
        },
      });
      setUser(updated);
      setSuccess('Perfil actualizado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar perfil');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">O Meu Perfil</h1>
        <p className="text-sm text-gray-500">Actualize os seus dados de contacto e empresa.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled className="mt-1 bg-gray-50" />
            </div>
            <div className="sm:col-span-2" />
            <div>
              <Label htmlFor="first_name">Nome</Label>
              <Input id="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="last_name">Apelido</Label>
              <Input id="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="nuit">NUIT</Label>
              <Input id="nuit" value={nuit} onChange={(e) => setNuit(e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <Label htmlFor="address">Morada de entrega</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="billing_address">Morada de faturação</Label>
              <Textarea id="billing_address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'A guardar...' : 'Guardar alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
