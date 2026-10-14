import Image, { getImageProps } from "next/image";
import { Check } from "lucide-react";

const reasons = [
  [
    "Experiência de mercado",
    "Conhecimento prático para orientar materiais, acabamentos e prazos.",
  ],
  [
    "Atendimento empresarial",
    "Comunicação clara para equipas, instituições e processos de aprovação.",
  ],
  [
    "Controlo de qualidade",
    "Validação da arte e acompanhamento do acabamento antes da entrega.",
  ],
  [
    "Soluções completas",
    "Menos fornecedores e mais consistência entre todos os materiais da marca.",
  ],
  [
    "Produção e instalação",
    "Acompanhamento até ao momento em que o trabalho fica pronto para usar.",
  ],
  [
    "Processo digital próximo",
    "Pedidos, aprovações e histórico organizados junto do cliente.",
  ],
];

export function WhyTrustSection() {
  const { props: portrait } = getImageProps({
    src: "/images/embroidery-mp-portrait.webp",
    alt: "Imagem ilustrativa de um boné claro com a marca PMaputo bordada em verde",
    width: 1122,
    height: 1402,
    sizes: "(min-width: 1280px) 520px, 44vw",
  });
  return (
    <section className="bg-[#F4F0E8] py-16 sm:py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-900 shadow-[0_26px_70px_-42px_rgba(23,33,29,0.45)]">
          <div className="relative aspect-[3/2] lg:aspect-[4/5]">
            <picture>
              <source
                media="(min-width: 1024px)"
                srcSet={portrait.srcSet}
                sizes={portrait.sizes}
              />
              <Image
                src="/images/embroidery-mp.webp"
                alt="Imagem ilustrativa de um boné claro com a marca PMaputo bordada em verde"
                fill
                sizes="100vw"
                className="object-cover object-center"
              />
            </picture>
          </div>
          <div className="p-6 text-white sm:p-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:bg-gradient-to-t lg:from-brand-900/90 lg:to-transparent lg:p-9 lg:pt-28">
            <p className="mt-2 max-w-md text-xl font-semibold leading-7">
              A qualidade final começa muito antes da entrega.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            Confiança construída no processo
          </p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl lg:text-5xl">
            Por que as empresas confiam na Maputo Publicidade?
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#66736D]">
            Não entregamos apenas materiais. Organizamos decisões, acompanhamos
            detalhes e cuidamos para que cada peça represente a empresa com
            profissionalismo.
          </p>

          <div className="mt-9 grid gap-x-7 gap-y-6 sm:grid-cols-2">
            {reasons.map(([title, description]) => (
              <div key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-dark">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#66736D]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
