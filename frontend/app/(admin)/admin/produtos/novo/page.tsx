'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ProductForm } from '@/components/admin/ProductForm';
import { createProduct, getCategories } from '@/lib/admin-api';
import type { Category, Product } from '@/lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    getCategories().then(setCategories).catch(() => setError('Erro ao carregar categorias'));
  }, [authLoading]);

  async function handleSubmit(formData: FormData): Promise<Product> {
    setLoading(true);
    setError('');
    try {
      const product = await createProduct(formData);
      return product;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar produto';
      setError(message);
      throw new Error(message);
    } finally {
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
        <h1 className="text-2xl font-bold text-dark">Novo produto</h1>
        <p className="text-sm text-gray-500">Adicionar produto ao catálogo</p>
      </div>
      <ProductForm categories={categories} onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
