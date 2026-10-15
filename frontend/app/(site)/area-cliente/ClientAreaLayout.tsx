"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  FileText,
  FolderKanban,
  Headphones,
  History,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  X,
} from "lucide-react";
import { useClientAuth } from "@/hooks/useClientAuth";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { PortalNotifications } from "@/components/PortalNotifications";
import { BrandDeskIdentity } from "@/components/BrandDeskIdentity";
import {
  brandDeskNavigation,
  isBrandDeskRouteActive,
} from "@/lib/branddesk-navigation";
import {
  BrandDeskActivityContext,
  useBrandDeskActivity,
} from "@/hooks/useBrandDeskActivity";

const icons = [
  LayoutDashboard,
  FileText,
  FolderKanban,
  BadgeCheck,
  Headphones,
  ReceiptText,
  LibraryBig,
  History,
  Building2,
];
const portalNav = brandDeskNavigation.map((item, index) => ({
  ...item,
  icon: icons[index],
}));

function getPageTitle(pathname: string) {
  if (pathname === "/area-cliente/apoio") return "Mensagens";
  if (pathname.startsWith("/area-cliente/faturas/")) return "Detalhe da fatura";
  if (pathname === "/area-cliente/faturas") return "Faturas e pagamentos";
  if (pathname === "/area-cliente/novo-pedido") return "Novo pedido";
  if (pathname.startsWith("/area-cliente/encomendas/"))
    return "Acompanhamento do pedido";
  if (pathname === "/area-cliente/encomendas") return "Projetos e entregas";
  if (pathname === "/area-cliente/historico") return "Histórico de trabalhos";
  if (pathname === "/area-cliente/aprovacoes") return "Aprovações";
  if (pathname.startsWith("/area-cliente/orcamentos/"))
    return "Detalhe da proposta";
  if (pathname === "/area-cliente/orcamentos") return "Pedidos e propostas";
  if (pathname === "/area-cliente/marca") return "Biblioteca da marca";
  if (pathname === "/area-cliente/perfil") return "Perfil da empresa";
  return "Visão geral";
}

type PortalSidebarProps = {
  displayName: string;
  email?: string;
  initial: string;
  pathname: string;
  onLogout: () => void;
  onNavigate?: () => void;
  counts: { approvals: number | null; messages: number | null };
};

function PortalSidebar({
  displayName,
  email,
  initial,
  pathname,
  onLogout,
  onNavigate,
  counts,
}: PortalSidebarProps) {
  return (
    <aside className="branddesk-sidebar flex h-full w-full max-w-[292px] flex-col lg:w-[292px]">
      <div className="flex h-[76px] items-center border-b border-[#e6ece7] px-5">
        <Link
          href="/area-cliente"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3"
        >
          <BrandDeskIdentity dark />
        </Link>
      </div>

      <div className="border-b border-[#edf1ee] p-4">
        <div className="branddesk-company flex items-center gap-3 rounded-2xl p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-sm font-semibold text-white shadow-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-dark">
              {displayName}
            </p>
            <p className="truncate text-xs text-[#718078]">{email}</p>
          </div>
        </div>
      </div>

      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        aria-label="Navegação do portal"
      >
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a9890]">
          Espaço da sua marca
        </p>
        <Link
          href="/area-cliente/novo-pedido"
          onClick={onNavigate}
          className="branddesk-new mb-4 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition"
        >
          <Plus className="h-4 w-4" />
          Novo pedido
        </Link>
        {portalNav.map((item) => {
          const Icon = item.icon;
          const active = isBrandDeskRouteActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-[#5d6d65] hover:bg-[#f5f7f4] hover:text-dark",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px]",
                  active ? "text-brand-700" : "text-[#829087]",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {(
                item.href === "/area-cliente/aprovacoes"
                  ? counts.approvals
                  : item.href === "/area-cliente/apoio"
                    ? counts.messages
                    : null
              ) ? (
                <span className="rounded-full bg-[#dcc386] px-2 py-0.5 text-[10px] font-bold text-[#193c31]">
                  {item.href === "/area-cliente/aprovacoes"
                    ? counts.approvals
                    : counts.messages}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#e6ece7] p-4">
        <div className="branddesk-support rounded-2xl p-4 text-white">
          <Headphones className="h-5 w-5 text-brand-200" />
          <p className="mt-3 text-sm font-semibold">Acompanhamento pela MP</p>
          <p className="mt-1 text-xs leading-5 text-white/65">
            Fale diretamente com quem acompanha os seus projetos.
          </p>
          <Link
            href="/area-cliente/apoio"
            onClick={onNavigate}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-brand-100"
          >
            Pedir apoio
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#b6cbc0] transition hover:bg-white/10 hover:text-white"
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
      <span className="sr-only">A carregar o BrandDesk...</span>
    </div>
  );
}

export default function ClientAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPublicAuthRoute =
    pathname === "/area-cliente/login" || pathname === "/area-cliente/registo";
  const { user, loading, error, retry } = useClientAuth({ enabled: !isPublicAuthRoute });
  const counts = useBrandDeskActivity(
    isPublicAuthRoute ? undefined : user?.id,
    pathname,
  );

  function handleLogout() {
    setMobileOpen(false);
    void logout().finally(() => router.push("/area-cliente/login"));
  }

  if (isPublicAuthRoute) return <>{children}</>;
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f7f4] px-4 text-center">
        <p className="max-w-sm text-sm text-[#5d6d65]">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  if (loading) return <PortalLoading />;

  const contactName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Cliente MP";
  const displayName = user?.profile?.company?.trim() || contactName;
  const initial = displayName.charAt(0).toUpperCase();
  const pageTitle = getPageTitle(pathname);

  const sidebarProps = {
    displayName,
    email: user?.email,
    initial,
    pathname,
    onLogout: handleLogout,
    counts,
  };

  return (
    <BrandDeskActivityContext.Provider value={counts}>
      <div className="branddesk-shell flex min-h-screen text-dark">
        <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <PortalSidebar {...sidebarProps} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="branddesk-topbar sticky top-0 z-30 flex h-[76px] items-center justify-between px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dfe7e1] text-[#56665d] transition hover:bg-[#f3f6f3] lg:hidden"
                aria-label="Abrir menu do portal"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-brand-700">
                  BrandDesk{" "}
                  <span className="normal-case tracking-normal text-[#876a31]">
                    by ETIOS
                  </span>
                </p>
                <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-dark">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href={(() => {
                  const parts = pathname.split("/");
                  const parameter =
                    parts[2] === "orcamentos"
                      ? "pedido"
                      : parts[2] === "encomendas"
                        ? "projeto"
                        : "";
                  return parameter && parts[3]
                    ? `/area-cliente/apoio?${parameter}=${encodeURIComponent(decodeURIComponent(parts[3]))}`
                    : "/area-cliente/apoio";
                })()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800"
                aria-label="Falar com a MP"
              >
                <Headphones className="h-4 w-4" />
                <span className="hidden sm:inline">Falar com a MP</span>
              </Link>
              {user ? <PortalNotifications userId={user.id} /> : null}
              <Link
                href="/"
                className="hidden items-center gap-1.5 text-sm font-semibold text-[#5d6d65] transition hover:text-brand-700 sm:inline-flex"
              >
                Voltar ao site
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <span
                className="hidden h-7 w-px bg-[#dfe7e1] sm:block"
                aria-hidden="true"
              />
              <div className="flex items-center gap-2.5">
                <div className="hidden min-w-0 text-right md:block">
                  <p className="max-w-40 truncate text-sm font-semibold text-dark">
                    {displayName}
                  </p>
                  <p className="max-w-40 truncate text-xs text-[#829087]">
                    {user?.email}
                  </p>
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
              <PortalSidebar
                {...sidebarProps}
                onNavigate={() => setMobileOpen(false)}
              />
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
    </BrandDeskActivityContext.Provider>
  );
}
