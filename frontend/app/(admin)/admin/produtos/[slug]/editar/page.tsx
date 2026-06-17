'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ProductForm } from '@/components/admin/ProductForm';
import { getCategories, getProduct, updateProduct } from '@/lib/admin-api';
import type { Category, Product } from '@/lib/api';

export default function EditProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !slug) return;
    Promise.all([getProduct(slug), getCategories()])
      .then(([prod, cats]) => {
        setProduct(prod);
        setCategories(cats);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar dados'));
  }, [authLoading, slug]);

  async function handleSubmit(formData: FormData) {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      await updateProduct(slug, formData);
      router.push('/admin/produtos');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar produto');
      setLoading(false);
    }
  }

  if (authLoading || !product) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Editar produto</h1>
        <p className="text-sm text-gray-500">Actualizar informações do produto</p>
      </div>
      <ProductForm
        product={product}
        categories={categories}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
}
