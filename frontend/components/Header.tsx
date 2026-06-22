'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, MapPin, Menu, MessageCircle, Phone, ShoppingCart, User, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';
import { getCart } from '@/lib/client-api';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/servicos', label: 'Serviços' },
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/portfolio', label: 'Portfólio' },
  { href: '/orcamento', label: 'Orçamento' },
  { href: '/contactos', label: 'Contactos' },
];

const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Vi o site da Maputo Publicidade e gostaria de falar sobre um projeto.';

function CartCount() {
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
    <Link href="/carrinho" className="relative inline-flex items-center justify-center rounded-md p-2 text-dark hover:bg-gray-100">
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div className="bg-brand-700 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs lg:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
            <a href="tel:+25882555736" className="inline-flex items-center gap-1.5 hover:text-brand-100">
              <Phone className="h-3.5 w-3.5" />
              82 555 736
            </a>
            <a href="mailto:maputopublicidade@outlook.com" className="hidden items-center gap-1.5 hover:text-brand-100 sm:inline-flex">
              <Mail className="h-3.5 w-3.5" />
              maputopublicidade@outlook.com
            </a>
            <span className="hidden items-center gap-1.5 lg:inline-flex">
              <MapPin className="h-3.5 w-3.5" />
              Rua da Resistência Nº 1550 R/C
            </span>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <a href="#" aria-label="Facebook" className="hover:text-brand-100">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Instagram" className="hover:text-brand-100">
              <Instagram className="h-4 w-4" />
            </a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:text-brand-100">
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-tight.png"
            alt="Maputo Publicidade"
            width={170}
            height={78}
            className="h-12 w-auto object-contain sm:h-14"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-dark hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <CartCount />
          <Link href="/area-cliente" className="rounded-md p-2 text-dark hover:bg-gray-100" aria-label="Área do cliente">
            <User className="h-5 w-5" />
          </Link>
          <a href="tel:+25882555736" className="flex items-center gap-1.5 text-sm font-medium text-dark hover:text-brand">
            <Phone className="h-4 w-4" />
            82 555 736
          </a>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </a>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <CartCount />
          <Link href="/area-cliente" className="rounded-md p-2 text-dark hover:bg-gray-100" aria-label="Área do cliente">
            <User className="h-5 w-5" />
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-dark hover:bg-gray-100"
            onClick={() => setMobileOpen((s) => !s)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t bg-white transition-all duration-300 lg:hidden',
          mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="flex flex-col gap-2 px-4 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-dark hover:bg-gray-50"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-2">
            <Button className="w-full gap-2">
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </a>
        </nav>
      </div>
    </header>
  );
}
