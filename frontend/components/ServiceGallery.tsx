import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { mainServices } from '@/lib/service-catalog';

export function ServiceGallery() {
  return (
    <div>
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
        {mainServices.map((service, index) => (
          <li key={service.slug} className="min-w-0">
            <Link href={`/servicos/${service.slug}`} className="group flex h-full flex-col rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-8">
              <div className="relative aspect-[3/2] overflow-hidden rounded-[1.5rem] bg-[#F1EBE1]">
                <Image src={service.image} alt={service.imageAlt} fill sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" quality={85} className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.035]" />
              </div>
              <div className="flex flex-1 flex-col px-1 pb-1 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#7A6A48]">{String(index + 1).padStart(2, '0')} / {service.title}</p>
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-800 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-xl font-semibold leading-7 tracking-[-0.025em] text-brand-800 sm:text-[22px]">{service.eyebrow}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#66736D]">{service.outcome}</p>
                <span className="mt-auto flex items-center gap-2 pt-5 text-xs font-semibold text-brand-800">Explore esta solução<span aria-hidden="true" className="h-px w-6 bg-[#BA9B55] motion-safe:transition-[width] motion-safe:group-hover:w-10" /></span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs leading-5 text-[#7A8780]">Imagens ilustrativas de aplicações e acabamentos. Cada projeto é adaptado à sua marca.</p>
    </div>
  );
}
