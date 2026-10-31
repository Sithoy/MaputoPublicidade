'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Activity,
  BarChart3,
  Boxes,
  Factory,
  FileText,
  FolderOpen,
  Handshake,
  Headphones,
  ImageIcon,
  LogOut,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth';
import type { User } from '@/lib/api';
import { getDefaultAdminPath, hasCapability, type StaffCapability } from '@/lib/rbac';

const navGroups = [
  {
    label: 'Operações',
    items: [
      { href: '/admin/recepcao', label: 'Recepção', icon: Headphones, capability: 'reception.manage' },
      { href: '/admin/studio', label: 'Studio · Artes', icon: ImageIcon, capability: 'quotes.artwork' },
      { href: '/admin/producao', label: 'Produção', icon: Factory, capability: 'production.view' },
      { href: '/admin/entregas', label: 'Entregas', icon: Truck, capability: 'orders.manage_delivery' },
    ],
  },
  {
    label: 'Comunicação',
    items: [{ href: '/admin/apoio', label: 'Caixa de entrada', icon: Headphones, capability: 'support.manage' }],
  },
  {
    label: 'Consulta e registos',
    items: [
      { href: '/admin', label: 'Visão geral', icon: BarChart3, capability: 'dashboard.view' },
      { href: '/admin/orcamentos', label: 'Pedidos', icon: ShoppingCart, capability: 'quotes.view' },
      { href: '/admin/propostas', label: 'Propostas', icon: FileText, capability: 'quotes.view' },
      { href: '/admin/encomendas', label: 'Encomendas', icon: Package, capability: 'orders.view' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/admin/faturas', label: 'Faturas', icon: FileText, capability: 'invoices.view' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { href: '/admin/produtos', label: 'Produtos', icon: Boxes, capability: 'catalog.manage' },
      { href: '/admin/portfolio', label: 'Portfólio', icon: ImageIcon, capability: 'content.manage' },
      { href: '/admin/parceiros', label: 'Parceiros', icon: Handshake, capability: 'content.manage' },
      { href: '/admin/categorias', label: 'Categorias', icon: FolderOpen, capability: 'catalog.manage' },
      { href: '/admin/pacotes', label: 'Pacotes', icon: Package, capability: 'catalog.manage' },
    ],
  },
  {
    label: 'Acesso',
    items: [{ href: '/admin/utilizadores', label: 'Utilizadores', icon: Users, capability: 'users.manage' },
      { href: '/admin/definicoes', label: 'Definições', icon: Settings, capability: 'integrations.manage' }],
  },
  {
    label: 'Website',
    items: [{ href: '/admin/trafego', label: 'Tráfego e resultados', icon: BarChart3, capability: 'traffic.view' }],
  },
  {
    label: 'Sistema',
    items: [{ href: '/admin/monitorizacao', label: 'Monitorização', icon: Activity, capability: 'observability.view' }],
  },
];

function isActiveRoute(pathname: string, href: string) {
  return href === '/admin'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const homeHref = getDefaultAdminPath(user);

  function handleLogout() {
    onNavigate?.();
    void logout().finally(() => router.push('/admin/login'));
  }

  return (
    <aside className="admin-sidebar desk-sidebar flex h-full w-[256px] flex-col border-r border-[#dfe7e1] bg-white">
      <div className="desk-sidebar-brand flex h-[76px] items-center border-b px-5">
        <Link href={homeHref} onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo-tight.png"
            alt="Maputo Publicidade"
            width={118}
            height={44}
            className="desk-logo h-9 w-auto object-contain"
            priority
          />
          <span className="h-8 w-px bg-[#dfe7e1]" aria-hidden="true" />
          <span className="desk-brand-label text-[10px] font-semibold uppercase leading-4 tracking-[0.14em]">
            Área de
            <br />
            Gestão
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegação administrativa">
        {navGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter((item) =>
            hasCapability(user, item.capability as StaffCapability) &&
            !(user.role === 'receptionist' && ['/admin/orcamentos', '/admin/propostas', '/admin/encomendas'].includes(item.href)) &&
            !(user.role === 'production' && item.href === '/admin/encomendas')
          );
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.label} className={cn(groupIndex > 0 && 'mt-6')}>
            <p className="desk-nav-label mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
              {group.label}
            </p>
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'desk-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      active
                        ? 'desk-nav-active'
                        : 'desk-nav-idle'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px]',
                        active ? 'desk-nav-icon-active' : 'desk-nav-icon'
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      <div className="desk-sidebar-footer border-t p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="desk-site-link flex items-center justify-between rounded-2xl px-4 py-3.5 text-white transition hover:bg-brand-800"
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
          className="desk-logout mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#68776f] transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
