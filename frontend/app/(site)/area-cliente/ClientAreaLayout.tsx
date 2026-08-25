'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  UserRound,
  X,
} from 'lucide-react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { removeToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

const portalNav = [
  { href: '/area-cliente', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/area-cliente/encomendas', label: 'Pedidos', icon: ClipboardList },
  { href: '/area-cliente/perfil', label: 'Perfil da empresa', icon: UserRound },
];

const SUPPORT_URL =
  'https://wa.me/25882555736?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20um%20pedido%20no%20Portal%20do%20Cliente.';

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/area-cliente/encomendas/')) return 'Acompanhamento do pedido';
  if (pathname === '/area-cliente/encomendas') return 'Pedidos';
  if (pathname === '/area-cliente/perfil') return 'Perfil da empresa';
  return 'Visão geral';
}

type PortalSidebarProps = {
  displayName: string;
  email?: string;
  initial: string;
  pathname: string;
  onLogout: () => void;
  onNavigate?: () => void;
};

function PortalSidebar({
  displayName,
  email,
  initial,
  pathname,
  onLogout,
  onNavigate,
}: PortalSidebarProps) {
  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-[#dfe7e1] bg-white">
      <div className="flex h-[76px] items-center border-b border-[#e6ece7] px-5">
        <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo-tight.png"
            alt="Maputo Publicidade"
            width={118}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
          <span className="h-8 w-px bg-[#dfe7e1]" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase leading-4 tracking-[0.14em] text-brand-800">
            Portal do
            <br />
            Cliente
          </span>
        </Link>
      </div>

      <div className="border-b border-[#edf1ee] p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[#f3f7f3] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-sm font-semibold text-white shadow-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-dark">{displayName}</p>
            <p className="truncate text-xs text-[#718078]">{email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navegação do portal">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a9890]">
          O seu trabalho
        </p>
        <Link
          href="/catalogo"
          onClick={onNavigate}
          className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-brand-800 px-3 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-20px_rgba(6,63,43,0.9)] transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Iniciar novo pedido
        </Link>
        {portalNav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/area-cliente'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                active
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-[#5d6d65] hover:bg-[#f5f7f4] hover:text-dark'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-brand-700' : 'text-[#829087]')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#e6ece7] p-4">
        <div className="rounded-2xl bg-brand-900 p-4 text-white">
          <Headphones className="h-5 w-5 text-brand-200" />
          <p className="mt-3 text-sm font-semibold">Precisa de ajuda?</p>
          <p className="mt-1 text-xs leading-5 text-white/65">
            Fale directamente com a nossa equipa sobre o seu pedido.
          </p>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-brand-100"
          >
            Falar com a equipa
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#68776f] transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}

function PortalLoading() {
  return (
    <div className="flex min-h-screen bg-[#f4f7f4]">
      <div className="hidden h-screen w-[280px] shrink-0 border-r border-[#dfe7e1] bg-white p-5 lg:block">
        <div className="h-10 w-44 animate-pulse rounded-xl bg-[#e6ece7]" />
        <div className="mt-8 h-16 animate-pulse rounded-2xl bg-[#edf2ee]" />
        <div className="mt-8 space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-[#edf2ee]" />
          <div className="h-11 animate-pulse rounded-xl bg-[#edf2ee]" />
          <div className="h-11 animate-pulse rounded-xl bg-[#edf2ee]" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-[76px] border-b border-[#dfe7e1] bg-white" />
        <div className="animate-pulse space-y-5 p-4 sm:p-6 lg:p-8">
          <div className="h-48 rounded-3xl bg-[#e2e9e3]" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
            <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
            <div className="h-28 rounded-2xl bg-[#e2e9e3]" />
          </div>
        </div>
      </div>
      <span className="sr-only">A carregar o Portal do Cliente...</span>
    </div>
  );
}

export default function ClientAreaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoginRoute = pathname === '/area-cliente/login';
  const { user, loading } = useClientAuth({ enabled: !isLoginRoute });

  function handleLogout() {
    removeToken();
    setMobileOpen(false);
    router.push('/area-cliente/login');
  }

  if (isLoginRoute) return <>{children}</>;
  if (loading) return <PortalLoading />;

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Cliente MP';
  const initial = displayName.charAt(0).toUpperCase();
  const pageTitle = getPageTitle(pathname);

  const sidebarProps = {
    displayName,
    email: user?.email,
    initial,
    pathname,
    onLogout: handleLogout,
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f4] text-dark">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <PortalSidebar {...sidebarProps} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#dfe7e1] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dfe7e1] text-[#56665d] transition hover:bg-[#f3f6f3] lg:hidden"
              aria-label="Abrir menu do portal"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-brand-700">
                Portal do Cliente
              </p>
              <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-dark">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-sm font-semibold text-[#5d6d65] transition hover:text-brand-700 sm:inline-flex"
            >
              Voltar ao site
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <span className="hidden h-7 w-px bg-[#dfe7e1] sm:block" aria-hidden="true" />
            <div className="flex items-center gap-2.5">
              <div className="hidden min-w-0 text-right md:block">
                <p className="max-w-40 truncate text-sm font-semibold text-dark">{displayName}</p>
                <p className="max-w-40 truncate text-xs text-[#829087]">{user?.email}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-sm font-semibold text-white">
                {initial}
              </div>
            </div>
          </div>
        </header>

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
            <PortalSidebar {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f5f2] text-[#56665d]"
              aria-label="Fechar menu do portal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
