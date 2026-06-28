'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, ShoppingBag, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useClientAuth } from '@/hooks/useClientAuth';
import { removeToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/area-cliente', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/area-cliente/encomendas', label: 'Encomendas', icon: ShoppingBag },
  { href: '/area-cliente/perfil', label: 'Perfil', icon: User },
];

export default function ClientAreaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === '/area-cliente/login';
  const { user, loading } = useClientAuth({ enabled: !isLoginRoute });

  function handleLogout() {
    removeToken();
    router.push('/area-cliente/login');
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row lg:py-12">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 border-b border-gray-100 pb-4">
              <p className="text-sm font-semibold text-dark">{user?.email}</p>
              <p className="text-xs text-gray-500">Área do Cliente</p>
            </div>
            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand text-white'
                        : 'text-dark hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
