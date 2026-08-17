import Link from 'next/link';
import { ArrowRight, BadgeCheck, Eye, UsersRound } from 'lucide-react';

const outcomes = [
  {
    icon: Eye,
    question: 'Precisa de ser mais visível?',
    title: 'Damos presença à sua marca.',
    description:
      'Criamos uma identidade reconhecível nos lugares certos, para que a sua empresa seja vista e lembrada pelo público que quer alcançar.',
    services: ['Publicidade exterior', 'Branding de viaturas', 'Sinalização'],
    href: '/servicos/impressao-digital-e-branding',
    linkLabel: 'Aumentar a visibilidade',
  },
  {
    icon: UsersRound,
    question: 'Quer aproximar a marca das pessoas?',
    title: 'Criamos experiências que ficam.',
    description:
      'Transformamos campanhas e momentos de contacto em experiências relevantes, consistentes e feitas para criar uma ligação real.',
    services: ['Eventos e ativações', 'Brindes personalizados', 'Materiais promocionais'],
    href: '/servicos/impressao-uv-e-brindes',
    linkLabel: 'Criar uma experiência',
  },
  {
    icon: BadgeCheck,
    question: 'Tem uma ideia que precisa de acontecer?',
    title: 'Executamos consigo, do início ao fim.',
    description:
      'Reunimos produção, acompanhamento e entrega num só parceiro, para que avance com clareza, consistência e confiança.',
    services: ['Produção integrada', 'Controlo de qualidade', 'Entrega e instalação'],
    href: '/servicos',
    linkLabel: 'Encontrar a solução certa',
  },
];

export function BrandTouchpointsSection() {
  return (
    <section id="solucoes" className="scroll-mt-24 bg-white py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-7 lg:grid-cols-[0.9fr_0.72fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Começamos pelo seu objetivo
            </p>
            <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl lg:text-5xl">
              Como podemos ajudar a sua marca a avançar?
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[#66736D] lg:justify-self-end lg:text-lg">
            Conte-nos o que precisa alcançar. Encontramos a combinação certa de ideias, materiais e
            execução para transformar esse objetivo numa presença de marca consistente.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {outcomes.map((item, index) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-[1.75rem] border border-[#E3E8E4] bg-[#FAFBF8] p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:bg-white hover:shadow-[0_24px_60px_-38px_rgba(6,63,43,0.38)] sm:p-7"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-50 transition-transform duration-500 group-hover:scale-125" />

              <div className="relative flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand shadow-sm">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-extrabold tracking-[0.16em] text-[#A4AEA8]">
                  0{index + 1}
                </span>
              </div>

              <div className="relative mt-10">
                <p className="text-sm font-bold text-brand-800">{item.question}</p>
                <h3 className="mt-3 text-2xl font-extrabold leading-8 tracking-[-0.025em] text-dark">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-[#66736D]">{item.description}</p>
              </div>

              <div className="relative mt-7 flex flex-wrap gap-2">
                {item.services.map((service) => (
                  <span
                    key={service}
                    className="rounded-full border border-[#E0E6E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B6B63]"
                  >
                    {service}
                  </span>
                ))}
              </div>

              <div className="relative mt-auto flex items-center gap-2 pt-9 text-sm font-bold text-brand-800">
                {item.linkLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
