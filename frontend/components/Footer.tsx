import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Vi o site da Maputo Publicidade e gostaria de falar sobre um projeto.';

export function Footer() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <footer className="bg-dark text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo-tight.png"
              alt="Maputo Publicidade"
              width={180}
              height={82}
              className="mb-4 h-14 w-auto object-contain brightness-0 invert"
            />
            <p className="text-sm leading-relaxed text-gray-300">
              Soluções completas em serigrafia, gráfica, impressão digital e brindes corporativos
              para impulsionar a imagem da sua empresa.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">Serviços</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/servicos" className="hover:text-white">Serigrafia e Bordado</Link></li>
              <li><Link href="/servicos" className="hover:text-white">Gráfica</Link></li>
              <li><Link href="/servicos" className="hover:text-white">Impressão Digital</Link></li>
              <li><Link href="/servicos" className="hover:text-white">Impressão UV e Brindes</Link></li>
              <li><Link href="/servicos" className="hover:text-white">Branding de Viaturas</Link></li>
              <li><Link href="/servicos" className="hover:text-white">Sinalização e Placas</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">Links Rápidos</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/sobre" className="hover:text-white">Sobre Nós</Link></li>
              <li><Link href="/catalogo" className="hover:text-white">Catálogo</Link></li>
              <li><Link href="/portfolio" className="hover:text-white">Portfólio</Link></li>
              <li><Link href="/orcamento" className="hover:text-white">Orçamento</Link></li>
              <li><Link href="/area-cliente/login" className="hover:text-white">Área do Cliente</Link></li>
              <li><Link href="/admin/login" className="hover:text-white">Administração</Link></li>
              <li><Link href="/contactos" className="hover:text-white">Contactos</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">Contactos</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand" />
                <span>82 555 736 / 84 741 2838 / 84 555 0250</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand" />
                <a href="mailto:maputopublicidade@outlook.com" className="hover:text-white">
                  maputopublicidade@outlook.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-brand" />
                <span>Rua da Resistência Nº 1550 R/C, Maputo</span>
              </li>
            </ul>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-brand">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Instagram" className="rounded-full bg-white/10 p-2 hover:bg-brand">
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="rounded-full bg-white/10 p-2 hover:bg-brand"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-gray-400 md:flex-row">
          <p>© {new Date().getFullYear()} Maputo Publicidade e Serviços Lda. Todos os direitos reservados.</p>
          <p>Desenvolvido com amor em Moçambique</p>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#111922]">
        <a
          href="https://www.etios.net"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Powered by ETIOS"
          className="mx-auto flex min-h-16 w-full items-center justify-center gap-4 px-4 text-white/80 transition hover:text-white"
        >
          <span className="grid h-9 w-9 grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-2 shadow-inner shadow-white/5">
            <span className="rounded-[3px] bg-white" />
            <span className="rounded-[3px] bg-white" />
            <span className="rounded-[3px] bg-white" />
            <span className="rounded-[3px] bg-white" />
          </span>
          <span className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-500">
              Powered by
            </span>
            <span className="text-sm font-bold uppercase tracking-[0.35em] text-white">
              ETIOS
              <sup className="ml-0.5 text-[8px] tracking-normal text-white/70">®</sup>
            </span>
          </span>
        </a>
      </div>
    </footer>
  );
}
