"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { PortfolioItem } from "@/lib/api";
import { portfolioCategory } from "@/lib/portfolio-presentation";
import { PortfolioPhoto } from "./PortfolioPhoto";

export function PortfolioProjectDialog({
  item,
  onClose,
}: {
  item: PortfolioItem;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  const completion = item.completion_date
    ? new Date(`${item.completion_date}T12:00:00`)
    : null;
  const hasDate = completion && !Number.isNaN(completion.getTime());
  return (
    <dialog
      ref={ref}
      aria-labelledby="portfolio-project-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
      className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto rounded-[1.75rem] bg-[#FEFDF9] p-0 text-dark shadow-2xl backdrop:bg-[#142C23]/65 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-[#E8E3D8] px-5 py-4 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7A6A48]">
          Portfólio / {portfolioCategory(item)}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar projeto"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E3E8E4] bg-white text-brand-800 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.25fr_0.85fr] lg:gap-9">
        <PortfolioPhoto item={item} detail />
        <div className="flex flex-col">
          <h2
            id="portfolio-project-title"
            className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-brand-800 sm:text-3xl"
          >
            {item.title}
          </h2>
          <dl className="mt-6 grid grid-cols-2 gap-5 border-y border-[#E8E3D8] py-5 text-sm">
            {item.client_name ? (
              <div>
                <dt className="text-xs text-[#7A8780]">Cliente</dt>
                <dd className="mt-1 font-medium text-brand-800">
                  {item.client_name}
                </dd>
              </div>
            ) : null}
            {hasDate ? (
              <div>
                <dt className="text-xs text-[#7A8780]">Conclusão</dt>
                <dd className="mt-1 font-medium text-brand-800">
                  {completion.toLocaleDateString("pt-MZ", {
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-[#7A8780]">Área</dt>
              <dd className="mt-1 font-medium text-brand-800">
                {item.category_name || portfolioCategory(item)}
              </dd>
            </div>
          </dl>
          {item.description ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-brand-800">
                Sobre o projeto
              </h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#66736D]">
                {item.description}
              </p>
            </div>
          ) : null}
          <div className="mt-auto pt-8">
            <p className="text-sm text-[#66736D]">
              Uma ideia semelhante para a sua empresa?
            </p>
            <Link
              href="/orcamento"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 underline decoration-[#C5AD76] underline-offset-8"
            >
              Fale sobre o seu projeto{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </dialog>
  );
}
