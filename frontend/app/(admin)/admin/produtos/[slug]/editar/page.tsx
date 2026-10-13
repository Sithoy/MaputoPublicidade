'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ProductForm } from '@/components/admin/ProductForm';
import { getCategories, getProduct, getProductCategories, saveProductDefinition } from '@/lib/admin-api';
import type { Category, Product, ProductCategory } from '@/lib/api';

export default function EditProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !slug) return;
    Promise.all([getProduct(slug), getCategories(), getProductCategories()])
      .then(([prod, cats, productCats]) => {
        setProduct(prod);
        setCategories(cats);
        setProductCategories(productCats);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar dados'));
  }, [authLoading, slug]);

  async function handleSubmit(formData: FormData): Promise<Product> {
    if (!slug) throw new Error('Slug inválido');
    setLoading(true);
    setError('');
    try {
      const product = await saveProductDefinition(formData, slug);
      return product;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao actualizar produto';
      setError(message);
      throw new Error(message);
    } finally {
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
        productCategories={productCategories}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
}
