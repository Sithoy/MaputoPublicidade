import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mainServices } from '@/lib/service-catalog';
import { serviceIconMap } from '@/lib/service-icons';

export const metadata = {
  title: 'Serviços | Maputo Publicidade',
  description: 'Conheça os serviços de publicidade, gráfica e impressão digital da Maputo Publicidade.',
};

export default function ServicesPage() {
  return (
    <div className="bg-white">
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
        <div className="mb-12 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Serviços
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-dark md:text-5xl">
            Produção publicitária completa para marcas que precisam aparecer bem.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-gray-600">
            Cada área tem uma página própria com descrição, processo e produtos associados,
            para chegar mais depressa ao serviço certo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mainServices.map((service) => {
            const ServiceIcon = serviceIconMap[service.iconName];

            return (
              <Card key={service.slug} className="group flex flex-col transition-shadow hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-dark">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    quality={90}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-white shadow-lg shadow-brand/25">
                    <ServiceIcon className="h-5 w-5" />
                  </div>
                </div>
                <CardContent className="flex flex-1 flex-col">
                  <h2 className="text-xl font-semibold text-dark">{service.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{service.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {service.points.map((point) => (
                      <span key={point} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                        {point}
                      </span>
                    ))}
                  </div>
                  <Link href={`/servicos/${service.slug}`} className="mt-5">
                    <Button variant="outline" className="w-full gap-2">
                      Conhecer serviço
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
