'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, MessageCircle, Phone, ShieldCheck, ShoppingCart, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';
import { getCart } from '@/lib/client-api';
import { companyProfile, telephoneHref, whatsappHref as buildWhatsappHref } from '@/lib/company';

const navLinks = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/servicos', label: 'Serviços' },
  { href: '/portfolio', label: 'Portfólio' },
  { href: '/sobre', label: 'Sobre Nós' },
];

const WHATSAPP_MESSAGE = 'Olá! Vi o site da Maputo Publicidade e gostaria de falar sobre um projeto.';

function CartCount({ inverted = false }: { inverted?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!getToken()) return;
    async function load() {
      try {
        const cart = await getCart();
        setCount(cart.item_count || 0);
      } catch {
        // ignore
      }
    }
    load();
    window.addEventListener('cart-updated', load);
    return () => window.removeEventListener('cart-updated', load);
  }, []);

  return (
    <Link
      href="/carrinho"
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-full transition',
        inverted
          ? 'text-white/85 hover:bg-white/10 hover:text-white'
          : 'text-[#304038] hover:bg-[#e9efea] hover:text-brand-700'
      )}
      aria-label="Carrinho"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

function AccountMenu({ inverted = false }: { inverted?: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition',
          inverted
            ? 'text-white/85 hover:bg-white/10 hover:text-white'
            : 'text-[#405047] hover:bg-white hover:text-brand-800'
        )}
        aria-expanded={open}
        aria-controls="account-access-menu"
        aria-haspopup="true"
      >
        <User className="h-[18px] w-[18px]" />
        Conta
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          id="account-access-menu"
          className="absolute right-0 top-[calc(100%+0.65rem)] w-72 overflow-hidden rounded-2xl border border-[#dce5de] bg-white p-2 text-left shadow-[0_24px_60px_-28px_rgba(6,63,43,0.55)]"
        >
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#829087]">
            Escolha o seu acesso
          </p>
          <Link
            href="/area-cliente/login"
            onClick={() => setOpen(false)}
            className="group flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-white">
              <User className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-dark">Área do cliente</span>
              <span className="mt-0.5 block text-xs leading-5 text-[#718078]">
                Pedidos, aprovações e histórico
              </span>
            </span>
          </Link>
          <Link
            href="/admin/login"
            onClick={() => setOpen(false)}
            className="group flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-[#f5f7f4]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf1ee] text-[#52635b] transition group-hover:bg-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-dark">Administração MP</span>
              <span className="mt-0.5 block text-xs leading-5 text-[#718078]">
                Acesso reservado à equipa
              </span>
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [isAtHomePosition, setIsAtHomePosition] = useState(isHome);

  useEffect(() => {
    if (!isHome) {
      setIsAtHomePosition(false);
      return;
    }

    const updateHeader = () => {
      setIsAtHomePosition(window.scrollY <= 1);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, [isHome]);

  const transparentHeader = isHome && isAtHomePosition;

  const whatsappHref = buildWhatsappHref(WHATSAPP_MESSAGE);

  return (
    <header
      className={cn(
        'site-header-enter top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-200',
        isHome ? 'fixed inset-x-0' : 'sticky',
        transparentHeader
          ? 'border-b border-transparent bg-transparent shadow-none'
          : 'border-b border-[#E3E8E4]/90 bg-[#FAFBF8]/95 shadow-[0_8px_28px_-24px_rgba(6,63,43,0.55)] backdrop-blur-xl'
      )}
    >
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-4 px-4 lg:h-[82px] lg:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo-tight.png"
            alt="Maputo Publicidade"
            width={170}
            height={78}
            className={cn(
              'h-11 w-auto max-w-[132px] object-contain transition-[filter] duration-300 sm:h-12 sm:max-w-none',
              transparentHeader && 'brightness-0 invert'
            )}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                transparentHeader
                  ? pathname === link.href
                    ? 'bg-white/12 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  : pathname === link.href ||
                      (link.href !== '/' && !link.href.includes('#') && pathname.startsWith(link.href))
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-[#52635B] hover:bg-white hover:text-dark'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          <CartCount inverted={transparentHeader} />
          <AccountMenu inverted={transparentHeader} />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 lg:hidden">
          <CartCount inverted={transparentHeader} />
          <button
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-full transition',
              transparentHeader
                ? 'bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20'
                : 'bg-white text-[#26382f] shadow-sm ring-1 ring-[#dce5de] hover:bg-[#edf2ee]'
            )}
            onClick={() => setMobileOpen((s) => !s)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-[#E3E8E4] bg-[#FAFBF8] transition-all duration-300 ease-out lg:hidden',
          mobileOpen ? 'max-h-[680px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                pathname === link.href || (link.href !== '/' && !link.href.includes('#') && pathname.startsWith(link.href))
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-[#425249] hover:bg-white'
              )}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMobileAccountOpen((current) => !current)}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#425249] transition-colors hover:bg-white"
            aria-expanded={mobileAccountOpen}
            aria-controls="mobile-account-access"
          >
            <User className="h-4 w-4" />
            <span className="flex-1">Conta</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', mobileAccountOpen && 'rotate-180')} />
          </button>
          {mobileAccountOpen ? (
            <div id="mobile-account-access" className="mx-2 grid gap-1 rounded-2xl border border-[#dfe7e1] bg-white p-2">
              <Link
                href="/area-cliente/login"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
                onClick={() => {
                  setMobileAccountOpen(false);
                  setMobileOpen(false);
                }}
              >
                <User className="h-4 w-4" />
                Área do cliente
              </Link>
              <Link
                href="/admin/login"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#52635b] hover:bg-[#f5f7f4]"
                onClick={() => {
                  setMobileAccountOpen(false);
                  setMobileOpen(false);
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                Administração MP
              </Link>
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#dde6df] pt-4">
            <a
              href={telephoneHref()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d4ded6] bg-white text-sm font-semibold text-[#304038]"
            >
              <Phone className="h-4 w-4" />
              {companyProfile.primaryPhone}
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#173426] text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
