'use client';

import { useEffect, useState } from 'react';
import { CartCheckout } from '@/components/CartCheckout';
import { QuoteForm } from '@/components/QuoteForm';
import { getToken } from '@/lib/auth';

export function OrcamentoContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthenticated(!!getToken());
  }, []);

  if (isAuthenticated === null) {
    return <div className="py-24 text-center text-gray-500">A carregar...</div>;
  }

  return isAuthenticated ? <CartCheckout /> : <QuoteForm />;
}
