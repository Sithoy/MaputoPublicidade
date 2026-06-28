import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MessageCircle, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Vi o site da Maputo Publicidade e gostaria de pedir um orçamento.';

export function HeroSection() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section className="relative min-h-[560px] overflow-hidden bg-dark text-white sm:min-h-[620px] lg:min-h-[650px]">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/supplied/hero-van-maputo.png"
          alt="Viatura personalizada pela Maputo Publicidade"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark/95 via-dark/60 to-dark/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/70 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-12 sm:min-h-[620px] sm:py-16 lg:min-h-[650px] lg:px-6">
        <div className="w-full max-w-[360px] space-y-5 sm:max-w-3xl sm:space-y-6">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur sm:px-4">
            <Sparkles className="h-4 w-4 shrink-0 text-accent" />
            Serigrafia, gráfica, brindes e branding em Maputo
          </div>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Soluções que <span className="text-brand">fortalecem a sua marca</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-gray-100 sm:text-lg">
            Produzimos material publicitário com presença: uniformes, viaturas, rollups,
            papelaria, brindes e sinalização para empresas que querem ser vistas com seriedade.
          </p>
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:gap-4">
            <Link href="/orcamento" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 shadow-lg shadow-brand/25 sm:w-auto">
                <ShoppingCart className="h-5 w-5" />
                Pedir Orçamento
              </Button>
            </Link>
            <Link href="/catalogo" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 border-white text-white hover:bg-white hover:text-dark sm:w-auto">
                Ver Catálogo
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="accent" className="w-full gap-2 sm:w-auto">
                Falar no WhatsApp
                <MessageCircle className="h-5 w-5" />
              </Button>
            </a>
          </div>
          <div className="grid max-w-2xl grid-cols-2 gap-2 pt-3 text-xs text-gray-100 sm:grid-cols-4 sm:gap-3 sm:pt-4 sm:text-sm">
            {['+10 anos', 'Entrega rápida', 'Arte final', 'Produção local'].map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-center backdrop-blur sm:px-3">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
