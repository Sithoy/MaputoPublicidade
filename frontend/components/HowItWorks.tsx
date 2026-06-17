import { MousePointerClick, Upload, FileText, CheckCircle, Truck } from 'lucide-react';

const steps = [
  {
    icon: MousePointerClick,
    title: 'Escolha',
    description: 'Escolha o produto ou serviço que precisa.',
  },
  {
    icon: Upload,
    title: 'Envie a arte',
    description: 'Faça upload do seu logótipo ou descrição da ideia.',
  },
  {
    icon: FileText,
    title: 'Receba orçamento',
    description: 'Receba o orçamento com preço e prazo de entrega.',
  },
  {
    icon: CheckCircle,
    title: 'Aprove a prova digital',
    description: 'Aprovamos a arte digital antes de produzir.',
  },
  {
    icon: Truck,
    title: 'Produzimos e entregamos',
    description: 'Produção com qualidade e entrega no prazo.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-light py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-dark md:text-4xl">Como Funciona</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Um processo simples e transparente do pedido à entrega.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-8 hidden h-1 w-[80%] -translate-x-1/2 bg-gray-200 lg:block" />
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step.title} className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white text-brand shadow-md">
                  <step.icon className="h-7 w-7" />
                </div>
                <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mb-1 font-semibold text-dark">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
