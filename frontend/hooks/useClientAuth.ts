'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, getToken, removeToken } from '@/lib/auth';
import type { User } from '@/lib/api';

type UseClientAuthOptions = {
  enabled?: boolean;
};

export function useClientAuth({ enabled = true }: UseClientAuthOptions = {}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

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
      .catch(() => {
        removeToken();
        router.replace('/area-cliente/login');
      });
  }, [enabled, router]);

  return { user, loading };
}
