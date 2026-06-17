import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Gostaria de pedir um orçamento para a minha empresa.';

export function CTABanner() {
  return (
    <section className="bg-gradient-to-r from-brand-700 via-brand to-brand-700 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 lg:flex-row lg:px-6">
        <div className="text-center lg:text-left">
          <h2 className="text-2xl font-bold md:text-3xl">Pronto para destacar a sua marca?</h2>
          <p className="mt-1 text-brand-50">
            Peça já o seu orçamento e receba uma proposta personalizada.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/orcamento">
            <Button size="lg" variant="accent" className="gap-2 text-dark">
              Pedir Orçamento Agora
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline" className="gap-2 border-white text-white hover:bg-white hover:text-brand">
              <MessageCircle className="h-5 w-5" />
              Falar no WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
