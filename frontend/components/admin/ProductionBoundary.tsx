'use client';

import type { ReactNode } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ProductionWorkspace } from './ProductionWorkspace';

export function ProductionBoundary({ children }: { children: ReactNode }) {
  const { user, loading } = useAdminAuth();
  if (loading) return <p>A carregar…</p>;
  return user?.role === 'production' ? <ProductionWorkspace /> : children;
}
