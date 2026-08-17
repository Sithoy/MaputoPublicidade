import { BadgeCheck, Building2, Handshake, Layers3 } from 'lucide-react';

const trustPoints = [
  {
    icon: BadgeCheck,
    title: 'Experiência comprovada',
    description: 'Mais de uma década a executar projetos para empresas e instituições.',
  },
  {
    icon: Building2,
    title: 'Produção local',
    description: 'Acompanhamento próximo, resposta prática e conhecimento do mercado.',
  },
  {
    icon: Handshake,
    title: 'Atendimento empresarial',
    description: 'Um parceiro que entende prazos, aprovações e consistência de marca.',
  },
  {
    icon: Layers3,
    title: 'Solução completa',
    description: 'Da criação à produção, instalação e entrega num único processo.',
  },
];

export function TrustMetricsSection() {
  return (
    <section aria-label="Razões para confiar na Maputo Publicidade" className="border-y border-[#E3E8E4] bg-white">
      <div className="mx-auto grid max-w-7xl sm:grid-cols-2 lg:grid-cols-4">
        {trustPoints.map((item) => (
          <article
            key={item.title}
            className="flex gap-4 border-b border-[#E3E8E4] px-5 py-7 last:border-b-0 sm:border-b sm:border-r sm:px-6 sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:py-8 lg:[&:nth-child(2)]:border-r lg:[&:last-child]:border-r-0"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <item.icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-dark">{item.title}</h2>
              <p className="mt-1 text-xs leading-5 text-[#66736D]">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
