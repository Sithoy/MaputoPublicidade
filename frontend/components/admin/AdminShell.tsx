'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getRequiredCapability, hasCapability } from '@/lib/rbac';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  if (isLogin) return <>{children}</>;

  return <ProtectedAdminShell pathname={pathname}>{children}</ProtectedAdminShell>;
}

function ProtectedAdminShell({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, defaultPath } = useAdminAuth();
  const requiredCapability = getRequiredCapability(pathname);
  const isAllowed = Boolean(
    user && (!requiredCapability || hasCapability(user, requiredCapability))
  );

  useEffect(() => {
    if (!loading && user && !isAllowed) {
      router.replace(defaultPath);
    }
  }, [defaultPath, isAllowed, loading, router, user]);

  if (loading || !user || !isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f4]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f7f4] text-dark">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <AdminSidebar user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader user={user} onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1480px]">{children}</div>
        </main>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-[#09130f]/55 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="relative h-full w-[min(88vw,320px)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <AdminSidebar user={user} onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f5f2] text-[#56665d]"
              aria-label="Fechar menu de administração"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
