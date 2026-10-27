'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { setAnalyticsConsent, TRAFFIC_CONSENT } from '@/lib/website-traffic';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!['granted', 'denied'].includes(localStorage.getItem(TRAFFIC_CONSENT) || '')) {
        setVisible(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const choose = (granted: boolean) => {
    setAnalyticsConsent(granted);
    setVisible(false);
  };

  if (!visible) return <div className="bg-brand-950 py-3 text-center"><button type="button" onClick={() => setVisible(true)} className="text-xs text-white/80 underline">Preferências de privacidade</button></div>;

  return (
    <>
      <div className="h-72 sm:h-40" aria-hidden />
      <div className="fixed bottom-3 left-3 z-50 w-[calc(100vw-1.5rem)] max-w-[360px] sm:bottom-4 sm:left-4 sm:max-w-2xl">
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-2xl shadow-gray-900/15 sm:flex-row sm:items-center sm:p-4">
          <p className="text-sm leading-relaxed text-gray-700">
            Podemos medir visitas e ações no website com a sua autorização. A análise é opcional; os serviços essenciais continuam disponíveis. Consulte a{' '}
            <Link href="/politica-cookies" className="font-medium text-brand hover:underline">
              Política de Cookies
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" className="font-medium text-brand hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto"><Button onClick={() => choose(true)} className="whitespace-nowrap">Permitir análise</Button><Button variant="outline" onClick={() => choose(false)} className="whitespace-nowrap">Apenas essenciais</Button></div>
        </div>
      </div>
    </>
  );
}
