'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartnerForm } from '@/components/admin/PartnerForm';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { createPartner } from '@/lib/admin-api';

export default function NewPartnerPage() {
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      await createPartner(formData);
      router.push('/admin/parceiros');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar parceiro');
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-dark">Novo parceiro</h1>
        <p className="text-sm text-gray-500">Adicionar empresa à apresentação de parceiros</p>
      </div>
      <PartnerForm onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
