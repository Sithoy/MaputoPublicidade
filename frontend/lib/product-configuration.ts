import type { Product } from "./api";

export const productTemplates = {
  standard: { label: "Produto simples / genérico", fields: [] },
  apparel: { label: "Vestuário", fields: [] },
  electronics: {
    label: "Eletrónica",
    fields: [
      { key: "model", label: "Modelo" },
      { key: "capacity", label: "Capacidade" },
      { key: "color", label: "Cor" },
      { key: "branding_area", label: "Área de personalização" },
    ],
  },
  banner: {
    label: "Banners e sinalética",
    fields: [
      { key: "format", label: "Formato / dimensões" },
      { key: "material", label: "Material" },
      { key: "finishing", label: "Acabamento" },
    ],
  },
  stationery: {
    label: "Papelaria e impressos",
    fields: [
      { key: "format", label: "Formato" },
      { key: "paper", label: "Papel" },
      { key: "pages", label: "Número de páginas" },
      { key: "finishing", label: "Acabamento" },
    ],
  },
} as const;
export type ProductTemplate = keyof typeof productTemplates;
export type CatalogueConfiguration = {
  template: ProductTemplate;
  category?: string;
  selections: { key: string; label: string; value: string }[];
};
export function productCategoryName(product: Product) {
  // Older API payloads remain usable during the rollout, without relabelling their data.
  return product.product_category_name === undefined
    ? product.category || "Outros produtos"
    : product.product_category_name || "Outros produtos";
}
export function productTemplate(product: Product): ProductTemplate {
  return product.order_template === "apparel"
    ? "apparel"
    : product.configuration_template || "standard";
}
export function configurationSnapshot(
  product: Product,
  selected: Record<string, string>,
): CatalogueConfiguration {
  const template = productTemplate(product);
  return {
    template,
    category: productCategoryName(product),
    selections: productTemplates[template].fields
      .filter((field) => selected[field.key])
      .map((field) => ({ ...field, value: selected[field.key] })),
  };
}
