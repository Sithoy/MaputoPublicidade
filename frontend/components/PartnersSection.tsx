'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Handshake } from 'lucide-react';
import { partners } from '@/lib/partners';
import type { Partner } from '@/lib/api';

const AUTO_ADVANCE_MS = 5000;
const LOOP_COPIES = 3;
const LOOP_ORIGIN_INDEX = 1;

function getCarouselStep(carousel: HTMLDivElement) {
  const activeCard = carousel.querySelector<HTMLElement>('[data-partner-card]');
  const computedStyles = window.getComputedStyle(carousel);
  const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || '0');

  if (!activeCard) {
    return Math.min(carousel.clientWidth * 0.72, 360);
  }

  return activeCard.offsetWidth + (Number.isFinite(gap) ? gap : 0);
}

function getLoopStart(carousel: HTMLDivElement, itemCount: number) {
  return getCarouselStep(carousel) * itemCount * LOOP_ORIGIN_INDEX;
}

function normalizeCarouselLoop(carousel: HTMLDivElement, itemCount: number) {
  const step = getCarouselStep(carousel);
  const setWidth = step * itemCount;
  const loopStart = setWidth * LOOP_ORIGIN_INDEX;
  const loopEnd = loopStart + setWidth;

  if (carousel.scrollLeft >= loopEnd - step * 0.5) {
    carousel.scrollLeft -= setWidth;
  }

  if (carousel.scrollLeft <= loopStart - step * 0.5) {
    carousel.scrollLeft += setWidth;
  }
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join('');
  return (initials || name.slice(0, 2)).toUpperCase();
}

function PartnerLogo({ partner }: { partner: Partner }) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [partner.logo]);

  if (partner.logo && !hasImageError) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-gray-100 bg-white p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={partner.logo}
          alt={partner.name}
          className="max-h-full max-w-full object-contain"
          onError={() => setHasImageError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-md bg-dark text-3xl font-bold text-white">
      {getInitials(partner.name)}
    </div>
  );
}

export function PartnersSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const normalizeTimerRef = useRef<number | null>(null);
  const [managedPartners, setManagedPartners] = useState<Partner[]>([]);
  const visiblePartners = managedPartners.length ? managedPartners : partners;
  const partnerLoop = Array.from({ length: LOOP_COPIES }, () => visiblePartners).flat();

  const scrollPartners = useCallback((direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel || visiblePartners.length === 0) return;

    carousel.scrollTo({
      left: carousel.scrollLeft + getCarouselStep(carousel) * direction,
      behavior: 'smooth',
    });

    if (normalizeTimerRef.current) {
      window.clearTimeout(normalizeTimerRef.current);
    }

    normalizeTimerRef.current = window.setTimeout(() => {
      normalizeCarouselLoop(carousel, visiblePartners.length);
    }, 650);
  }, [visiblePartners.length]);

  useEffect(() => {
    let mounted = true;

    fetch('/api/partners/')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Partner[]) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setManagedPartners(data);
        }
      })
      .catch(() => {
        if (mounted) setManagedPartners([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || visiblePartners.length === 0) return;

    const resetToLoopStart = () => {
      carousel.scrollLeft = getLoopStart(carousel, visiblePartners.length);
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
  }, [visiblePartners.length]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) return;

    const timer = window.setInterval(() => {
      if (!isPausedRef.current) {
        scrollPartners(1);
      }
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [scrollPartners]);

  return (
    <section className="overflow-hidden border-y border-gray-100 bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Handshake className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Nossos parceiros
            </p>
            <h2 className="mt-2 text-3xl font-bold text-dark md:text-4xl">
              Marcas e empresas que confiaram no nosso trabalho.
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollPartners(-1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-white text-dark shadow-sm transition hover:border-brand hover:text-brand"
              aria-label="Parceiros anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollPartners(1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-white text-dark shadow-sm transition hover:border-brand hover:text-brand"
              aria-label="Proximos parceiros"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Lista de parceiros"
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
          {partnerLoop.map((partner, index) => (
            <article
              key={`${partner.name}-${index}`}
              data-partner-card
              className="flex min-h-[260px] shrink-0 basis-[74%] snap-start flex-col justify-between rounded-lg border border-gray-100 bg-gray-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/25 hover:bg-white hover:shadow-md sm:basis-[42%] md:basis-[calc((100%_-_40px)/3)] lg:basis-[calc((100%_-_60px)/4)]"
            >
              <div>
                <PartnerLogo partner={partner} />
                <h3 className="mt-4 text-base font-semibold text-dark">{partner.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{partner.sector}</p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-brand via-secondary to-brand/20" />
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold uppercase tracking-[0.14em] text-brand hover:text-secondary"
                  >
                    Site
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
