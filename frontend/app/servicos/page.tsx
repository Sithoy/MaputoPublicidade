import { Shirt, Printer, Paintbrush, Sun, Truck, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const services = [
  {
    icon: Shirt,
    title: 'Serigrafia e Bordado',
    description:
      'Personalização de polos, camisetas, bonés, uniformes corporativos, sacolas e coletes. Ideal para uniformes e merchandising de alta durabilidade.',
    examples: ['Polos bordados', 'Camisetas serigrafadas', 'Bonés personalizados', 'Coletes de segurança'],
  },
  {
    icon: Printer,
    title: 'Gráfica',
    description:
      'Produção gráfica profissional: folhetos, cartazes, panfletos, envelopes, livros, brochuras e cartões de visita com acabamentos de qualidade.',
    examples: ['Cartões de visita', 'Brochuras', 'Folhetos', 'Envelopes personalizados'],
  },
  {
    icon: Paintbrush,
    title: 'Impressão Digital e Branding',
    description:
      'Impressão digital em grande formato e soluções de branding: placas, autocolantes, rollups, teardrops, gazebos, bandeiras, stands, edifícios e lojas.',
    examples: ['Rollups', 'Gazebos', 'Banners', 'Branding de viaturas'],
  },
  {
    icon: Sun,
    title: 'Impressão UV e Brindes',
    description:
      'Impressão UV direta em quase todo tipo de material e brindes corporativos personalizados para eventos, campanhas e presentes de fidelização.',
    examples: ['Canetas', 'Chávenas', 'Blocos de notas', 'Garrafas'],
  },
  {
    icon: Truck,
    title: 'Branding de Viaturas',
    description:
      'Transforme a sua frota em veículos de publicidade móvel com vinil de alta durabilidade e acabamento profissional.',
    examples: ['Decoração total', 'Vinil recortado', 'Adesivos magnéticos'],
  },
  {
    icon: Award,
    title: 'Sinalização e Placas',
    description:
      'Placas para interiores e exteriores, sinalização de segurança, fachadas e displays para lojas e escritórios.',
    examples: ['Placas acrílicas', 'Placas PVC', 'Luminosos', 'Sinalização'],
  },
];

export const metadata = {
  title: 'Serviços | Maputo Publicidade',
  description: 'Conheça os serviços de publicidade, gráfica e impressão digital da Maputo Publicidade.',
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-dark md:text-4xl">Os Nossos Serviços</h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Soluções integradas para quem quer comunicar com qualidade, consistência e impacto.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.title} className="transition-shadow hover:shadow-md">
            <CardContent className="flex h-full flex-col">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <service.icon className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-dark">{service.title}</h2>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">{service.description}</p>
              <ul className="mb-5 flex flex-wrap gap-2">
                {service.examples.map((example) => (
                  <li key={example} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                    {example}
                  </li>
                ))}
              </ul>
              <Link href="/orcamento">
                <Button className="w-full">Pedir orçamento</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
