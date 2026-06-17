'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mainServices } from '@/lib/service-catalog';
import { serviceIconMap } from '@/lib/service-icons';

const AUTO_ADVANCE_MS = 5000;
const LOOP_COPIES = 3;
const LOOP_ORIGIN_INDEX = 1;

const carouselServices = Array.from({ length: LOOP_COPIES }, () => mainServices).flat();

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
  return getCarouselStep(carousel) * mainServices.length * LOOP_ORIGIN_INDEX;
}

function normalizeCarouselLoop(carousel: HTMLDivElement) {
  const step = getCarouselStep(carousel);
  const setWidth = step * mainServices.length;
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
          {carouselServices.map((service, index) => {
            const ServiceIcon = serviceIconMap[service.iconName];

            return (
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
                      <ServiceIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold leading-snug text-dark">{service.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{service.summary}</p>
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

                  <Link href={`/servicos/${service.slug}`} className="mt-5">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      Saiba mais
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
