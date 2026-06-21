'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, getToken, removeToken } from '@/lib/auth';
import type { User } from '@/lib/api';

export function useAdminAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      removeToken();
      router.replace('/admin/login');
      return;
    }

    fetchSession()
      .then((data) => {
        const sessionUser = data.data?.user;
        if (!sessionUser?.is_staff) {
          removeToken();
          router.replace('/area-cliente');
          return;
        }
        setUser(sessionUser as User);
        setLoading(false);
      })
      .catch(() => {
        removeToken();
        router.replace('/admin/login');
      });
  }, [router]);

  return { user, loading, isStaff: user?.is_staff ?? false };
}
