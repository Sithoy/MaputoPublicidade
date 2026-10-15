'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, getToken, removeToken, SessionError } from '@/lib/auth';
import type { User } from '@/lib/api';
import { getDefaultAdminPath, hasCapability, type StaffCapability } from '@/lib/rbac';

export function useAdminAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkSession = useCallback(() => {
    setLoading(true);
    setError('');

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
      .catch((err) => {
        // Only a definitive auth rejection clears the session; transient
        // network/server problems offer a retry instead of a forced logout.
        if (err instanceof SessionError && err.code === 'expired') {
          removeToken();
          router.replace('/admin/login');
          return;
        }
        setError('Não foi possível validar a sessão. Verifique a sua ligação.');
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    user,
    loading,
    error,
    retry: checkSession,
    isStaff: user?.is_staff ?? false,
    can: (capability: StaffCapability) => hasCapability(user, capability),
    defaultPath: getDefaultAdminPath(user),
  };
}
