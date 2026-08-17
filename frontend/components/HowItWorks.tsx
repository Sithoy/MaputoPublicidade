import { ClipboardList, FileCheck2, MessageSquareText, Settings2, Truck } from 'lucide-react';

const steps = [
  {
    icon: MessageSquareText,
    title: 'Briefing',
    description: 'Entendemos a necessidade, o objetivo, a quantidade e o prazo do projeto.',
  },
  {
    icon: ClipboardList,
    title: 'Proposta',
    description: 'Organizamos opções, materiais, quantidades, orçamento e calendário.',
  },
  {
    icon: FileCheck2,
    title: 'Arte e aprovação',
    description: 'Preparamos ou validamos a arte antes de avançar para produção.',
  },
  {
    icon: Settings2,
    title: 'Produção',
    description: 'Executamos o trabalho com acompanhamento e controlo de qualidade.',
  },
  {
    icon: Truck,
    title: 'Entrega ou instalação',
    description: 'Finalizamos o projeto e acompanhamos a entrega ou instalação.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 max-w-3xl lg:mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Um processo acompanhado</p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl lg:text-5xl">Da ideia à presença da sua marca.</h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#66736D] sm:text-lg">
            Cada etapa tem um objetivo claro, para reduzir dúvidas, retrabalho e surpresas na entrega.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[10%] right-[10%] top-6 hidden h-px bg-[#DCE5DF] lg:block" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <article key={step.title} className="relative z-10 rounded-2xl border border-[#E3E8E4] bg-[#FAFBF8] p-5 transition hover:border-brand/20 hover:bg-white sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand shadow-sm">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-extrabold tracking-[0.12em] text-[#A3AEA8]">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-base font-bold text-dark">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#66736D]">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
