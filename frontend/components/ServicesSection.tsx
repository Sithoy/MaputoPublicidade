'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Gift,
  Paintbrush,
  Printer,
  Shirt,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const AUTO_ADVANCE_MS = 5000;
const LOOP_COPIES = 3;
const LOOP_ORIGIN_INDEX = 1;

const services: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
  image: string;
  href: string;
}> = [
  {
    icon: Shirt,
    title: 'Serigrafia e Bordado',
    description: 'Uniformes, polos, camisetas, bonés, coletes e sacolas com acabamento profissional.',
    points: ['Polos', 'Bonés', 'Uniformes'],
    image: '/images/supplied/serigrafia-bordado.png',
    href: '/servicos',
  },
  {
    icon: Printer,
    title: 'Gráfica',
    description: 'Folhetos, cartazes, catálogos, brochuras, envelopes, livros e cartões de visita.',
    points: ['Catálogos', 'Cartões', 'Folhetos'],
    image: '/images/supplied/grafica.png',
    href: '/servicos',
  },
  {
    icon: Paintbrush,
    title: 'Impressão Digital e Branding',
    description: 'Rollups, teardrops, gazebos, placas, autocolantes, viaturas, lojas e eventos.',
    points: ['Rollups', 'Viaturas', 'Placas'],
    image: '/images/supplied/impressao-digital-branding.png',
    href: '/servicos',
  },
  {
    icon: Gift,
    title: 'Impressão UV e Brindes',
    description: 'Impressão direta em diversos materiais e brindes corporativos personalizados.',
    points: ['UV', 'Brindes', 'Premium'],
    image: '/images/supplied/impressao-uv-brindes.png',
    href: '/servicos',
  },
  {
    icon: Crosshair,
    title: 'Cortes a Laser',
    description: 'Cortes precisos em acrílico, MDF, madeira, couro, papel e plástico para peças únicas.',
    points: ['Acrílico', 'MDF', 'Precisão'],
    image: '/images/supplied/cortes-a-laser.png',
    href: '/servicos',
  },
  {
    icon: Box,
    title: 'Painéis em 3D',
    description: 'Painéis decorativos, letras caixa, sinalização 3D e acabamentos para interiores e fachadas.',
    points: ['3D', 'Letras caixa', 'Interiores'],
    image: '/images/supplied/paineis-3d.png',
    href: '/servicos',
  },
];

const carouselServices = Array.from({ length: LOOP_COPIES }, () => services).flat();

function getCarouselStep(carousel: HTMLDivElement) {
  const activeCard = carousel.querySelector<HTMLElement>('[data-service-card]');
  const computedStyles = window.getComputedStyle(carousel);
  const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || '0');

  if (!activeCard) {
    return Math.min(carousel.clientWidth * 0.9, 920);
  }

  return activeCard.offsetWidth + (Number.isFinite(gap) ? gap : 0);
}

function getLoopStart(carousel: HTMLDivElement) {
  return getCarouselStep(carousel) * services.length * LOOP_ORIGIN_INDEX;
}

function normalizeCarouselLoop(carousel: HTMLDivElement) {
  const step = getCarouselStep(carousel);
  const setWidth = step * services.length;
  const loopStart = setWidth * LOOP_ORIGIN_INDEX;
  const loopEnd = loopStart + setWidth;

  if (carousel.scrollLeft >= loopEnd - step * 0.5) {
    carousel.scrollLeft -= setWidth;
  }

  if (carousel.scrollLeft <= loopStart - step * 0.5) {
    carousel.scrollLeft += setWidth;
  }
}

export function ServicesSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const normalizeTimerRef = useRef<number | null>(null);

  const scrollServices = useCallback((direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const nextScroll = carousel.scrollLeft + getCarouselStep(carousel) * direction;

    carousel.scrollTo({
      left: nextScroll,
      behavior: 'smooth',
    });

    if (normalizeTimerRef.current) {
      window.clearTimeout(normalizeTimerRef.current);
    }

    normalizeTimerRef.current = window.setTimeout(() => {
      normalizeCarouselLoop(carousel);
    }, 650);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const resetToLoopStart = () => {
      carousel.scrollLeft = getLoopStart(carousel);
    };

    const frame = window.requestAnimationFrame(resetToLoopStart);
    window.addEventListener('resize', resetToLoopStart);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resetToLoopStart);
      if (normalizeTimerRef.current) {
        window.clearTimeout(normalizeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) return;

    const timer = window.setInterval(() => {
      if (!isPausedRef.current) {
        scrollServices(1);
      }
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [scrollServices]);

  return (
    <section className="overflow-hidden bg-dark py-14 text-white lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white md:text-4xl">Serviços principais</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-300 lg:mx-0">
              Produção publicitária completa, com imagens reais de cada especialidade em destaque.
            </p>
          </div>

          <div className="flex justify-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => scrollServices(-1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white shadow-sm transition hover:border-brand hover:bg-brand"
              aria-label="Serviços anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollServices(1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white shadow-sm transition hover:border-brand hover:bg-brand"
              aria-label="Próximos serviços"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Lista de serviços principais"
          onFocusCapture={() => {
            isPausedRef.current = true;
          }}
          onBlurCapture={() => {
            isPausedRef.current = false;
          }}
          onMouseEnter={() => {
            isPausedRef.current = true;
          }}
          onMouseLeave={() => {
            isPausedRef.current = false;
          }}
        >
          {carouselServices.map((service, index) => (
            <Card
              key={`${service.title}-${index}`}
              data-service-card
              className="group flex shrink-0 basis-[88%] snap-start flex-col overflow-hidden border-white/10 bg-white text-dark shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 sm:basis-[58%] md:basis-[calc((100%_-_24px)/2)] lg:basis-[calc((100%_-_72px)/4)]"
            >
              <div className="relative aspect-video overflow-hidden bg-dark">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, (min-width: 640px) 58vw, 88vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  quality={92}
                />
              </div>

              <CardContent className="flex flex-1 flex-col p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-lg shadow-brand/25">
                    <service.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold leading-snug text-dark">{service.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{service.description}</p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5">
                  {service.points.map((point) => (
                    <span
                      key={point}
                      className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                    >
                      {point}
                    </span>
                  ))}
                </div>

                <Link href={service.href} className="mt-5">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    Saiba mais
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
