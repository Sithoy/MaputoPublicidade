'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  FolderOpen,
  Handshake,
  ImageIcon,
  LogOut,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { removeToken } from '@/lib/auth';

const navGroups = [
  {
    label: 'Operação',
    items: [
      { href: '/admin', label: 'Visão geral', icon: BarChart3 },
      { href: '/admin/encomendas', label: 'Encomendas', icon: Package },
      { href: '/admin/orcamentos', label: 'Orçamentos', icon: ShoppingCart },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { href: '/admin/produtos', label: 'Produtos', icon: Boxes },
      { href: '/admin/portfolio', label: 'Portfólio', icon: ImageIcon },
      { href: '/admin/parceiros', label: 'Parceiros', icon: Handshake },
      { href: '/admin/categorias', label: 'Categorias', icon: FolderOpen },
      { href: '/admin/pacotes', label: 'Pacotes', icon: Package },
    ],
  },
  {
    label: 'Acesso',
    items: [{ href: '/admin/utilizadores', label: 'Utilizadores', icon: Users }],
  },
];

function isActiveRoute(pathname: string, href: string) {
  return href === '/admin'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    removeToken();
    onNavigate?.();
    router.push('/admin/login');
  }

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-[#dfe7e1] bg-white">
      <div className="flex h-[76px] items-center border-b border-[#e6ece7] px-5">
        <Link href="/admin" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
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
            Área de
            <br />
            Gestão
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegação administrativa">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && 'mt-6')}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a9890]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(pathname, item.href);

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
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px]',
                        active ? 'text-brand-700' : 'text-[#829087]'
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#e6ece7] p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-2xl bg-brand-900 px-4 py-3.5 text-white transition hover:bg-brand-800"
        >
          <span>
            <span className="block text-sm font-semibold">Ver website</span>
            <span className="mt-0.5 block text-xs text-white/60">Abrir área pública</span>
          </span>
          <ArrowUpRight className="h-4 w-4 text-brand-200" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#68776f] transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
