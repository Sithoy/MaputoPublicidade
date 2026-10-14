import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ServiceGallery } from './ServiceGallery';

export function ServicesSection() {
  return (
    <section id="solucoes" aria-labelledby="services-heading" className="scroll-mt-24 bg-[#FEFDF9] py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A713B]">Da sua ideia à presença da sua marca</p>
            <h2 id="services-heading" className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] text-brand-800 sm:text-4xl lg:text-5xl">Como podemos ajudar a sua marca a avançar?</h2>
          </div>
          <div className="max-w-lg">
            <p className="text-base leading-7 text-[#66736D]">Uma equipa reconhecível. Uma apresentação cuidada. Um espaço que fala pela sua empresa. Encontramos consigo a solução certa, com atenção a cada detalhe.</p>
            <Link href="/servicos" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 underline decoration-[#C5AD76] underline-offset-8 hover:decoration-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Conheça as nossas soluções <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
        <ServiceGallery />
      </div>
    </section>
  );
}
