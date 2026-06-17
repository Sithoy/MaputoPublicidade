import Link from 'next/link';
import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const packages = [
  {
    name: 'Start',
    price: 'Sob consulta',
    description: 'Ideal para pequenas empresas que estão a começar a sua identidade visual.',
    items: ['100 cartões de visita', '1 rollup 85x200cm', 'Design incluído'],
  },
  {
    name: 'Evento',
    price: 'Sob consulta',
    description: 'Tudo o que precisa para marcar presença em feiras e eventos.',
    items: ['1 gazebo 3x3m', '2 rollups', '100 folhetos A5', 'Brindes personalizados'],
  },
  {
    name: 'Uniforme',
    price: 'Sob consulta',
    description: 'Kit profissional para equipas que representam a marca no terreno.',
    items: ['10 polos bordados', '10 bonés', '1 colete de segurança'],
  },
  {
    name: 'Branding',
    price: 'Sob consulta',
    description: 'Transforme a imagem da sua empresa com uma solução completa.',
    items: ['Branding de viatura', 'Placa de loja', 'Cartões e papelaria', 'Rollups e banners'],
  },
];

export function PackagesSection() {
  return (
    <section className="bg-light py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-dark md:text-4xl">Pacotes para Empresas</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Soluções pré-montadas para as necessidades mais comuns. Personalizáveis.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <Card key={pkg.name} className="flex flex-col">
              <CardContent className="flex h-full flex-col">
                <h3 className="text-xl font-bold text-dark">{pkg.name}</h3>
                <p className="mt-1 text-2xl font-bold text-brand">{pkg.price}</p>
                <p className="mt-3 text-sm text-gray-600">{pkg.description}</p>
                <ul className="my-5 flex-1 space-y-2">
                  {pkg.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={`/orcamento?pacote=${pkg.name.toLowerCase()}`}>
                  <Button className="w-full">Pedir este pacote</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
