import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ServiceGallery } from '@/components/ServiceGallery';

export const metadata = {
  title: 'Serviços | Maputo Publicidade',
  description: 'Uniformes, impressão, branding, brindes e sinalização: soluções para uma presença de marca consistente em Maputo.',
};

export default function ServicesPage() {
  return (
    <div className="bg-[#FEFDF9]">
      <section className="border-b border-[#E8E3D8] bg-[#F5F1E8]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-20 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A713B]">Serviços / Maputo Publicidade</p>
            <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-brand-800 sm:text-5xl lg:text-6xl">A sua marca.<br />Bem representada.</h1>
          </div>
          <div className="max-w-lg">
            <p className="text-base leading-7 text-[#66736D] sm:text-lg">Das peças que a sua equipa veste aos espaços onde recebe os seus clientes, ajudamos a dar forma a uma presença profissional, consistente e memorável.</p>
            <Link href="/orcamento" className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Fale sobre o seu projeto <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
      <section aria-labelledby="service-solutions-heading" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-9 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E3D8] pb-5">
          <h2 id="service-solutions-heading" className="text-lg font-semibold text-brand-800">Encontre a solução para o seu objetivo.</h2>
          <p className="text-xs font-medium text-[#7A6A48]">06 áreas · um parceiro de execução</p>
        </div>
        <ServiceGallery />
        <div className="mt-14 flex flex-col gap-5 rounded-2xl border border-[#E3D6B7] bg-[#F5F1E8] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-brand-800">Não precisa de saber o nome técnico.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#66736D]">Conte-nos o que quer alcançar. Ajudamos a escolher os materiais, a personalização e o acabamento.</p>
          </div>
          <Link href="/orcamento" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-brand-800 underline decoration-[#C5AD76] underline-offset-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Vamos encontrar a solução <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  );
}
