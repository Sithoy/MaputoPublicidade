'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PartnerForm } from '@/components/admin/PartnerForm';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getPartner, updatePartner } from '@/lib/admin-api';
import type { Partner } from '@/lib/api';

export default function EditPartnerPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { loading: authLoading } = useAdminAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !slug) return;
    getPartner(slug)
      .then(setPartner)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar parceiro'));
  }, [authLoading, slug]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      await updatePartner(slug, formData);
      router.push('/admin/parceiros');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar parceiro');
      setLoading(false);
    }
  }

  if (authLoading || (!partner && !error)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Editar parceiro</h1>
        <p className="text-sm text-gray-500">Actualizar dados e logotipo da empresa</p>
      </div>
      <PartnerForm partner={partner} onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
