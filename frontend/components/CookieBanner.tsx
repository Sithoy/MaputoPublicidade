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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-gray-700">
          Utilizamos cookies para melhorar a experiência. Ao continuar, aceita a nossa{' '}
          <Link href="/politica-cookies" className="text-brand hover:underline">
            Política de Cookies
          </Link>{' '}
          e a{' '}
          <Link href="/privacidade" className="text-brand hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <Button onClick={accept} className="whitespace-nowrap">
          Aceitar
        </Button>
      </div>
    </div>
  );
}
