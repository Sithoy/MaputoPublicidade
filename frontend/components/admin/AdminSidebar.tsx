'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  LogOut,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { removeToken } from '@/lib/auth';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/orcamentos', label: 'Encomendas', icon: ShoppingCart },
  { href: '/admin/produtos', label: 'Produtos', icon: Boxes },
  { href: '/admin/portfolio', label: 'Portfólio', icon: ImageIcon },
  { href: '/admin/categorias', label: 'Categorias', icon: FolderOpen },
  { href: '/admin/pacotes', label: 'Pacotes', icon: Package },
  { href: '/admin/utilizadores', label: 'Utilizadores', icon: Users },
  { href: '/', label: 'Ver site', icon: LayoutGrid },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-lg font-bold text-brand">Maputo Publicidade</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={() => {
            removeToken();
            window.location.href = '/admin/login';
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
