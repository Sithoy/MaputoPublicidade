import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MessageCircle, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Vi o site da Maputo Publicidade e gostaria de pedir um orçamento.';

export function HeroSection() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section className="relative min-h-[650px] overflow-hidden bg-dark text-white">
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

      <div className="relative z-10 mx-auto flex min-h-[650px] max-w-7xl items-center px-4 py-16 lg:px-6">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            <Sparkles className="h-4 w-4 text-accent" />
            Serigrafia, gráfica, brindes e branding em Maputo
          </div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
            Soluções que <span className="text-brand">fortalecem a sua marca</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-gray-100">
            Produzimos material publicitário com presença: uniformes, viaturas, rollups,
            papelaria, brindes e sinalização para empresas que querem ser vistas com seriedade.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/orcamento">
              <Button size="lg" className="gap-2 shadow-lg shadow-brand/25">
                <ShoppingCart className="h-5 w-5" />
                Pedir Orçamento
              </Button>
            </Link>
            <Link href="/catalogo">
              <Button size="lg" variant="outline" className="gap-2 border-white text-white hover:bg-white hover:text-dark">
                Ver Catálogo
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="accent" className="gap-2">
                Falar no WhatsApp
                <MessageCircle className="h-5 w-5" />
              </Button>
            </a>
          </div>
          <div className="grid max-w-2xl grid-cols-2 gap-3 pt-4 text-sm text-gray-100 sm:grid-cols-4">
            {['+10 anos', 'Entrega rápida', 'Arte final', 'Produção local'].map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
