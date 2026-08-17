'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Building2, ChevronLeft, ChevronRight, Handshake } from 'lucide-react';
import { normalizePaginatedResponse } from '@/lib/api';
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
      <div className="relative flex h-24 w-full items-center justify-center px-5 sm:h-28">
        <Image
          src={partner.logo}
          alt={`Logótipo da ${partner.name}`}
          fill
          sizes="(min-width: 1024px) 190px, (min-width: 640px) 220px, 66vw"
          className="object-contain p-5"
          unoptimized={partner.logo.startsWith('data:')}
          onError={() => setHasImageError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-full items-center justify-center text-2xl font-extrabold tracking-[-0.04em] text-brand-800 sm:h-28">
      {getInitials(partner.name)}
    </div>
  );
}

export function PartnersSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const normalizeTimerRef = useRef<number | null>(null);
  const [managedPartners, setManagedPartners] = useState<Partner[]>([]);
  const visiblePartners = managedPartners;
  const partnerLoop =
    visiblePartners.length > 1
      ? Array.from({ length: LOOP_COPIES }, () => visiblePartners).flat()
      : visiblePartners;

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
    const controller = new AbortController();

    fetch('/api/partners/', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = normalizePaginatedResponse<Partner>(data)
          .filter((partner) => partner.is_active !== false)
          .sort((left, right) => Number(right.is_featured) - Number(left.is_featured));
        setManagedPartners(list);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setManagedPartners([]);
      });

    return () => controller.abort();
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
    if (visiblePartners.length < 2) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) return;

    const timer = window.setInterval(() => {
      if (!isPausedRef.current) {
        scrollPartners(1);
      }
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [scrollPartners, visiblePartners.length]);

  if (visiblePartners.length === 0) {
    return null;
  }

  return (
    <section id="parceiros" className="scroll-mt-24 overflow-hidden bg-brand-800 py-14 text-white sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mb-9 grid gap-7 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-100">
              <Handshake className="h-4 w-4" />
              Nossos parceiros
            </div>
            <h2 className="text-balance text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
              Marcas que confiam na nossa capacidade de executar.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
              Relações construídas com consistência, resposta próxima e atenção ao detalhe — em
              projetos que representam empresas e instituições de referência em Moçambique.
            </p>
          </div>

          <div className="flex items-end justify-between gap-5 lg:justify-end">
            <div className="hidden max-w-xs items-center gap-3 text-sm leading-6 text-white/60 sm:flex">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-100">
                <Building2 className="h-4 w-4" />
              </span>
              Empresas de diferentes sectores, unidas pela confiança no nosso trabalho.
            </div>
            {visiblePartners.length > 1 ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => scrollPartners(-1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
                  aria-label="Parceiros anteriores"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollPartners(1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
                  aria-label="Próximos parceiros"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
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
              className="flex min-h-[190px] shrink-0 basis-[72%] snap-start flex-col justify-between rounded-2xl border border-white/15 bg-white p-4 text-dark shadow-[0_18px_45px_-32px_rgba(0,0,0,0.55)] transition hover:-translate-y-1 hover:shadow-[0_22px_48px_-28px_rgba(0,0,0,0.62)] sm:basis-[42%] md:basis-[calc((100%_-_32px)/3)] lg:basis-[calc((100%_-_64px)/5)]"
            >
              <PartnerLogo partner={partner} />
              <div className="border-t border-[#E3E8E4] pt-3 text-center">
                <h3 className="truncate text-sm font-bold text-dark">{partner.name}</h3>
                {partner.sector ? (
                  <p className="mt-1 truncate text-xs text-[#748078]">{partner.sector}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
