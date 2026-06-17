'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, LogOut, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getToken, removeToken, fetchWithAuth } from '@/lib/auth';
import type { Quote } from '@/lib/api';

export default function ClientDashboardPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.push('/area-cliente/login');
      return;
    }

    fetchWithAuth('/api/quotes/')
      .then((data) => {
        setQuotes((data as Quote[]) || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar orçamentos');
        setLoading(false);
      });
  }, [router]);

  function handleLogout() {
    removeToken();
    router.push('/area-cliente/login');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark md:text-4xl">Os Meus Orçamentos</h1>
          <p className="mt-1 text-gray-600">Acompanhe o estado dos seus pedidos.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">A carregar...</p>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p>Ainda não tem orçamentos enviados.</p>
            <Link href="/orcamento">
              <Button className="mt-4">Pedir primeiro orçamento</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-brand">{quote.reference}</span>
                    <Badge variant="outline">{quote.status}</Badge>
                  </div>
                  <h2 className="font-semibold text-dark">{quote.product_name}</h2>
                  <p className="text-sm text-gray-500">
                    Quantidade: {quote.quantity} • Enviado em {new Date(quote.created_at).toLocaleDateString('pt-MZ')}
                  </p>
                  {quote.estimated_price && (
                    <p className="text-sm font-medium text-dark">
                      Estimativa: {quote.estimated_price.toLocaleString()} MZN
                    </p>
                  )}
                </div>
                <Link href={`/orcamento?produto=${quote.product_slug || quote.product_name}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reencomendar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
