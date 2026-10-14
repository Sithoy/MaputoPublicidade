import type { PortfolioItem } from "./api";

const categoryLabels: Record<string, string> = {
  "serigrafia e bordado": "Uniformes",
  grafica: "Gráfica",
  "impressao digital e branding": "Branding",
  "impressao uv e brindes": "Brindes",
  "paineis em 3d": "Sinalização",
  "paineis 3d": "Sinalização",
  "cortes a laser": "Corte a laser",
};

export function portfolioCategory(item: PortfolioItem) {
  const name = item.category_name?.trim();
  if (!name) return "Outras aplicações";
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return categoryLabels[key] || name;
}

export function portfolioImageIsIllustrative(src?: string | null) {
  if (!src) return false;
  return (
    /^\/images\/(brand|services)\//.test(src) ||
    /^https?:\/\/[^/]+\/images\/(brand|services)\//.test(src)
  );
}
