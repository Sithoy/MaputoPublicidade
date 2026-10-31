'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getOrder } from '@/lib/admin-api';
import { orderWorkspaceHref } from '@/lib/admin-workspaces';
import { hasCapability } from '@/lib/rbac';
import { ProductionWorkspace } from './ProductionWorkspace';

export function ProductionBoundary({ children }: { children: ReactNode }) {
  const { user, loading } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState('');
  const reference = pathname.startsWith('/admin/encomendas/') ? pathname.split('/')[3] : '';
  useEffect(() => {
    if (loading || user?.role !== 'production' || !reference) return;
    let active = true;
    getOrder(reference).then((order) => {
      if (!active) return;
      const target = orderWorkspaceHref(order, (capability) => hasCapability(user, capability));
      router.replace(target === pathname ? `/admin/entregas?encomenda=${encodeURIComponent(reference)}` : target);
    }).catch(() => { if (active) setError('Não foi possível abrir este trabalho no espaço operacional.'); });
    return () => { active = false; };
  }, [loading, user, reference, pathname, router]);
  if (loading) return <p>A carregar…</p>;
  if (user?.role === 'production' && reference) return error ? <p role="alert">{error}</p> : <p>A abrir o trabalho no espaço responsável…</p>;
  return user?.role === 'production' ? <ProductionWorkspace /> : children;
}
