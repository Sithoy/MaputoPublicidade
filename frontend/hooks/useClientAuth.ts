'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, getToken, removeToken } from '@/lib/auth';
import type { User } from '@/lib/api';

export function useClientAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [router]);

  return { user, loading };
}
