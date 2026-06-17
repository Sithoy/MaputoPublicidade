'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth, getToken, removeToken } from '@/lib/auth';
import type { User } from '@/lib/api';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useAdminAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initialCheck = useMemo(() => {
    const token = getToken();
    if (!token) return { authenticated: false, isStaff: false };
    const payload = decodeJwtPayload(token);
    return {
      authenticated: true,
      isStaff: !!payload?.is_staff,
      token,
    };
  }, []);

  useEffect(() => {
    if (!initialCheck.authenticated) {
      removeToken();
      router.replace('/admin/login');
      return;
    }

    if (!initialCheck.isStaff) {
      removeToken();
      router.replace('/area-cliente');
      return;
    }

    fetchWithAuth('/api/auth/me/')
      .then((data) => {
        setUser(data as User);
        setLoading(false);
      })
      .catch(() => {
        removeToken();
        router.replace('/admin/login');
      });
  }, [router, initialCheck]);

  return { user, loading, isStaff: initialCheck.isStaff };
}
