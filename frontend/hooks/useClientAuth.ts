'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, getToken, removeToken, SessionError } from '@/lib/auth';
import type { User } from '@/lib/api';

type UseClientAuthOptions = {
  enabled?: boolean;
};

export function useClientAuth({ enabled = true }: UseClientAuthOptions = {}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkSession = useCallback(() => {
    if (!enabled) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    if (!getToken()) {
      removeToken();
      router.replace('/area-cliente/login');
      return;
    }

    fetchSession()
      .then((data) => {
        const sessionUser = data.data?.user;
        if (!sessionUser) {
          removeToken();
          router.replace('/area-cliente/login');
          return;
        }
        if (sessionUser.is_staff) {
          router.replace('/admin');
          return;
        }
        setUser(sessionUser as User);
        setLoading(false);
      })
      .catch((err) => {
        // Only a definitive auth rejection clears the session; transient
        // network/server problems offer a retry instead of a forced logout.
        if (err instanceof SessionError && err.code === 'expired') {
          removeToken();
          router.replace('/area-cliente/login');
          return;
        }
        setError('Não foi possível validar a sessão. Verifique a sua ligação.');
        setLoading(false);
      });
  }, [enabled, router]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return { user, loading, error, retry: checkSession };
}
