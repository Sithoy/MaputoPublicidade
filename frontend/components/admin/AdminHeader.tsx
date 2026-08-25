'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu } from 'lucide-react';

function getPageTitle(pathname: string) {
  if (pathname === '/admin') return 'Visão geral';
  if (pathname.startsWith('/admin/encomendas/')) return 'Acompanhamento da produção';
  if (pathname === '/admin/encomendas') return 'Produção e entregas';
  if (pathname.startsWith('/admin/orcamentos/')) return 'Pedido e proposta';
  if (pathname === '/admin/orcamentos') return 'Pedidos e propostas';
  if (pathname.includes('/produtos/novo')) return 'Novo produto';
  if (pathname.includes('/produtos/') && pathname.endsWith('/editar')) return 'Editar produto';
  if (pathname === '/admin/produtos') return 'Produtos';
  if (pathname.includes('/portfolio/novo')) return 'Novo item de portfólio';
  if (pathname.includes('/portfolio/') && pathname.endsWith('/editar')) return 'Editar portfólio';
  if (pathname === '/admin/portfolio') return 'Portfólio';
  if (pathname.includes('/parceiros/novo')) return 'Novo parceiro';
  if (pathname.includes('/parceiros/') && pathname.endsWith('/editar')) return 'Editar parceiro';
  if (pathname === '/admin/parceiros') return 'Parceiros';
  if (pathname === '/admin/categorias') return 'Categorias';
  if (pathname === '/admin/pacotes') return 'Pacotes';
  if (pathname === '/admin/utilizadores/novo') return 'Novo utilizador';
  if (pathname.startsWith('/admin/utilizadores/')) return 'Detalhe do utilizador';
  if (pathname === '/admin/utilizadores') return 'Utilizadores';
  return 'Administração';
}

export function AdminHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#dfe7e1] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dfe7e1] text-[#56665d] transition hover:bg-[#f3f6f3] lg:hidden"
          aria-label="Abrir menu de administração"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-brand-700">
            Administração
          </p>
          <p className="truncate text-lg font-semibold tracking-[-0.02em] text-dark">{pageTitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/"
          className="hidden items-center gap-1.5 text-sm font-semibold text-[#5d6d65] transition hover:text-brand-700 sm:inline-flex"
        >
          Ver website
          <ArrowUpRight className="h-4 w-4" />
        </Link>
        <span className="hidden h-7 w-px bg-[#dfe7e1] sm:block" aria-hidden="true" />
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-dark">Equipa MP</p>
            <p className="text-xs text-[#829087]">Gestão interna</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 text-xs font-bold tracking-[0.06em] text-white">
            MP
          </div>
        </div>
      </div>
    </header>
  );
}
