import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export function HeroSection() {
  return (
    <section
      data-home-hero
      className="relative flex min-h-[760px] overflow-hidden bg-[#063F2B] text-white sm:min-h-[800px] lg:min-h-[820px]"
    >
      <Image
        src="/images/hero-trust-v2.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-[62%_center] sm:object-center"
        priority
        quality={92}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,31,22,0.94)_0%,rgba(6,63,43,0.82)_45%,rgba(6,63,43,0.32)_78%,rgba(6,63,43,0.16)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#031f16]/75 via-transparent to-[#031f16]/30" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-between px-4 pb-9 pt-32 sm:px-6 sm:pb-11 sm:pt-40 lg:pb-12 lg:pt-44">
        <div className="hero-copy-enter max-w-3xl py-12 sm:py-16 lg:py-20">
          <div className="mb-7 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white/85 sm:text-sm">
            <ShieldCheck className="h-5 w-5 text-[#D6A842]" strokeWidth={1.8} />
            Relações construídas com base na confiança
          </div>

          <h1 className="text-balance text-[2.8rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.7rem] lg:leading-[0.98]">
            A sua marca merece um parceiro em quem pode confiar.
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/80 sm:text-xl sm:leading-8">
            Há mais de 10 anos a apoiar algumas das marcas mais reconhecidas de Moçambique, com
            proximidade, compromisso e atenção a cada detalhe.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/orcamento"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-[#063F2B] shadow-[0_14px_32px_-16px_rgba(0,0,0,0.65)] transition hover:-translate-y-0.5 hover:bg-[#F4F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#063F2B] sm:w-auto"
            >
              Falar sobre o seu projeto
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sobre"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/5 px-7 text-base font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#063F2B] sm:w-auto"
            >
              Conheça a nossa história
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="grid border-t border-white/25 pt-7 sm:grid-cols-3 sm:gap-8 sm:pt-8">
          <div className="pb-5 sm:pb-0">
            <p className="text-2xl font-bold text-white">10+ anos</p>
            <p className="mt-1 text-sm text-white/65">a construir relações duradouras</p>
          </div>
          <div className="border-t border-white/15 py-5 sm:border-l sm:border-t-0 sm:py-0 sm:pl-8">
            <p className="text-base font-semibold text-white">Proximidade</p>
            <p className="mt-1 text-sm text-white/65">acompanhamento humano e atento</p>
          </div>
          <div className="border-t border-white/15 pt-5 sm:border-l sm:border-t-0 sm:pt-0 sm:pl-8">
            <p className="text-base font-semibold text-white">Compromisso</p>
            <p className="mt-1 text-sm text-white/65">responsabilidade em cada entrega</p>
          </div>
        </div>
      </div>
    </section>
  );
}
