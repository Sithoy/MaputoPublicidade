import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Gostaria de pedir um orçamento para a minha empresa.';

export function CTABanner() {
  return (
    <section className="bg-[#FAFBF8] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-brand-800 px-6 py-12 text-white sm:px-10 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[55px] border-white/5" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Próximo passo</p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
            Vamos organizar a presença visual da sua marca?
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Fale connosco e receba uma proposta ajustada às necessidades, ao prazo e à realidade da sua empresa.
          </p>
        </div>
        <div className="relative mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
          <Link href="/orcamento" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-brand-800 transition hover:-translate-y-0.5 hover:bg-brand-50">
            Pedir orçamento
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <MessageCircle className="h-5 w-5" />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
