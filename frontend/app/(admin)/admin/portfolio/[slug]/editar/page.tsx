'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { PortfolioForm } from '@/components/admin/PortfolioForm';
import { getCategories, getPortfolioItem, updatePortfolioItem } from '@/lib/admin-api';
import type { Category, PortfolioItem } from '@/lib/api';

export default function EditPortfolioItemPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !slug) return;
    Promise.all([getPortfolioItem(slug), getCategories()])
      .then(([it, cats]) => {
        setItem(it);
        setCategories(cats);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar dados'));
  }, [authLoading, slug]);

  async function handleSubmit(formData: FormData) {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      await updatePortfolioItem(slug, formData);
      router.push('/admin/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar item');
      setLoading(false);
    }
  }

  if (authLoading || !item) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Editar item de portfólio</h1>
        <p className="text-sm text-gray-500">Actualizar informações do trabalho</p>
      </div>
      <PortfolioForm
        item={item}
        categories={categories}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
}
