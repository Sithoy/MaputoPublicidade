"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import type { PortfolioItem } from "@/lib/api";
import { normalizePaginatedResponse } from "@/lib/api";
import { getPublicContentApiUrl } from "@/lib/public-content-api";
import { portfolioCategory } from "@/lib/portfolio-presentation";
import { PortfolioPhoto } from "./PortfolioPhoto";
import { PortfolioProjectDialog } from "./PortfolioProjectDialog";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function PortfolioGallery({
  limit,
  variant = "section",
}: {
  limit?: number;
  variant?: "section" | "page";
}) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [active, setActive] = useState("Todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<PortfolioItem | null>(null);
  const isPage = variant === "page";
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const collected: PortfolioItem[] = [];
        const visited = new Set<string>();
        let path: string | null = "/api/portfolio/";
        for (let page = 0; path && page < 50; page++) {
          if (visited.has(path))
            throw new Error("A paginação do portfólio não foi concluída.");
          visited.add(path);
          const response: Response = await fetch(
            getPublicContentApiUrl(path as `/${string}`),
            {
              signal: controller.signal,
              credentials: "omit",
              headers: { Accept: "application/json" },
            },
          );
          if (!response.ok)
            throw new Error("Não foi possível carregar o portfólio.");
          const data: PortfolioItem[] | { results?: PortfolioItem[]; next?: string | null } = await response.json();
          if (!Array.isArray(data) && !Array.isArray(data?.results))
            throw new Error("Não foi possível carregar o portfólio.");
          collected.push(...normalizePaginatedResponse<PortfolioItem>(data));
          if (!Array.isArray(data) && data.next) {
            // Follow only the portfolio cursor through the same public API, never a third-party next URL.
            const next: URL = new URL(
              data.next,
              "https://maputopublicidade.com/api/portfolio/",
            );
            if (next.pathname !== "/api/portfolio/")
              throw new Error("Paginação do portfólio inválida.");
            path = `/api/portfolio/${next.search}`;
          } else path = null;
        }
        if (path)
          throw new Error("Não foi possível carregar todos os projetos.");
        if (!controller.signal.aborted) {
          setItems(
            Array.from(
              new Map(
                collected
                  .filter((item) => item.is_active !== false)
                  .map((item) => [item.id, item]),
              ).values(),
            ),
          );
          setActive("Todos");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o portfólio.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);
  const categories = [
    "Todos",
    ...Array.from(new Set(items.map(portfolioCategory))),
  ];
  const query = normalizeSearch(search.trim());
  const filtered = items.filter(
    (item) =>
      (active === "Todos" || portfolioCategory(item) === active) &&
      (!query ||
        normalizeSearch(
          `${item.title} ${item.client_name || ""} ${item.description || ""}`,
        ).includes(query)),
  );
  const visible =
    typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  return (
    <section
      className={
        isPage
          ? "bg-[#FEFDF9] pb-16 lg:pb-24"
          : "bg-[#F5F1E8] py-16 sm:py-20 lg:py-28"
      }
    >
      {isPage ? (
        <div className="border-b border-[#E8E3D8] bg-[#F5F1E8]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-20 lg:py-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A713B]">
                Portfólio / Maputo Publicidade
              </p>
              <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-brand-800 sm:text-5xl lg:text-6xl">
                Ideias que ganham forma.
                <br />
                Marcas que ganham presença.
              </h1>
            </div>
            <div>
              <p className="max-w-lg text-base leading-7 text-[#66736D] sm:text-lg">
                Explore aplicações, materiais e acabamentos. Abra um projeto
                para conhecer os detalhes e encontrar inspiração para a sua
                empresa.
              </p>
              <a
                href="#projectos"
                className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 underline decoration-[#C5AD76] underline-offset-8"
              >
                Explore os projetos{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      ) : null}
      <div
        id={isPage ? "projectos" : undefined}
        className={`mx-auto max-w-7xl px-4 sm:px-6 ${isPage ? "scroll-mt-24 pt-10 sm:pt-14" : ""}`}
      >
        {!isPage ? (
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A713B]">
                Portfólio selecionado
              </p>
              <h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.035em] text-brand-800 sm:text-4xl lg:text-5xl">
                Veja a sua próxima ideia ganhar forma.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#66736D]">
                Descubra aplicações de marca e abra cada projeto para ver os
                detalhes.
              </p>
            </div>
            <Link
              href="/portfolio"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 underline decoration-[#C5AD76] underline-offset-8"
            >
              Explore o portfólio{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
        {!loading && !error ? (
          <div className="mb-9 flex flex-col gap-5 border-b border-[#E8E3D8] pb-5">
            <div
              className="flex flex-wrap gap-2"
              aria-label="Filtrar portfólio por área"
            >
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  aria-pressed={active === category}
                  onClick={() => setActive(category)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active === category ? "border-brand-800 bg-brand-800 text-white" : "border-[#DEDACF] bg-transparent text-[#52635B] hover:bg-white"}`}
                >
                  {category}
                </button>
              ))}
            </div>
            {isPage ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="flex w-full items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 sm:max-w-sm">
                  <Search
                    aria-hidden="true"
                    className="h-4 w-4 text-[#7A8780]"
                  />
                  <span className="sr-only">Pesquisar projetos</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    type="search"
                    placeholder="Projeto ou cliente"
                    className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-brand/20"
                  />
                </label>
                <p aria-live="polite" className="text-xs text-[#7A6A48]">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "projeto" : "projetos"}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        {loading ? (
          <div
            aria-label="A carregar portfólio"
            aria-busy="true"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="aspect-[4/3] rounded-[1.5rem] bg-[#E8E3D8] motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-[#E8E3D8] bg-white p-8 text-center"
          >
            <p className="text-sm text-[#66736D]">{error}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-4 min-h-11 rounded-xl border border-brand-800 px-4 py-2 text-sm font-semibold text-brand-800"
            >
              Tentar novamente
            </button>
          </div>
        ) : !visible.length ? (
          <div className="rounded-2xl border border-[#E8E3D8] bg-white p-10 text-center">
            <p className="text-sm text-[#66736D]">
              {items.length
                ? "Nenhum projeto corresponde à sua pesquisa."
                : "Ainda não existem projetos publicados."}
            </p>
            {items.length ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActive("Todos");
                }}
                className="mt-4 min-h-11 text-sm font-semibold text-brand-800 underline"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
            {visible.map((item) => (
              <article key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  aria-label={`Abrir projeto: ${item.title}`}
                  aria-haspopup="dialog"
                  className="group flex h-full w-full flex-col rounded-[1.5rem] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-brand"
                >
                  <div className="w-full">
                    <PortfolioPhoto item={item} />
                  </div>
                  <div className="w-full px-1 pt-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#7A6A48]">
                        {portfolioCategory(item)}
                      </p>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-brand-800"
                      />
                    </div>
                    <h3 className="mt-3 text-xl font-semibold leading-7 tracking-[-0.025em] text-brand-800">
                      {item.title}
                    </h3>
                    {item.client_name ? (
                      <p className="mt-2 text-sm text-[#66736D]">
                        {item.client_name}
                      </p>
                    ) : null}
                    {item.description ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#66736D]">
                        {item.description}
                      </p>
                    ) : null}
                    <span className="mt-4 block text-xs font-semibold text-brand-800">
                      Ver projeto
                    </span>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
        {typeof limit === "number" && filtered.length > limit ? (
          <Link
            href="/portfolio"
            className="mt-9 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 underline underline-offset-8"
          >
            Ver todos os projetos{" "}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
        {isPage ? (
          <div className="mt-16 flex flex-col gap-5 rounded-2xl border border-[#E3D6B7] bg-[#F5F1E8] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A713B]">
                O próximo projeto
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-800">
                Vamos criar algo para a sua marca?
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#66736D]">
                Partilhe a sua ideia. Ajudamos a escolher os materiais e a dar
                forma à solução.
              </p>
            </div>
            <Link
              href="/orcamento"
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Fale sobre o seu projeto{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>
      {selected ? (
        <PortfolioProjectDialog
          key={selected.id}
          item={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
