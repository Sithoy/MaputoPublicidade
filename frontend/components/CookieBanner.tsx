'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const CONSENT_KEY = 'mp_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) !== 'accepted') {
        setVisible(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="h-32 sm:h-24" aria-hidden />
      <div className="fixed bottom-3 left-3 right-3 z-50 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-2xl">
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-2xl shadow-gray-900/15 sm:flex-row sm:items-center sm:p-4">
          <p className="text-sm leading-relaxed text-gray-700">
            Utilizamos cookies para melhorar a experiência. Ao continuar, aceita a nossa{' '}
            <Link href="/politica-cookies" className="font-medium text-brand hover:underline">
              Política de Cookies
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" className="font-medium text-brand hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
          <Button onClick={accept} className="w-full whitespace-nowrap sm:w-auto">
            Aceitar
          </Button>
        </div>
      </div>
    </>
  );
}
