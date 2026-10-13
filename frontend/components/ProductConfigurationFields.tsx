"use client";

import type { Product } from "@/lib/api";
import {
  productTemplate,
  productTemplates,
  configurationSnapshot,
  type CatalogueConfiguration,
} from "@/lib/product-configuration";

export function ProductConfigurationFields({
  product,
  value,
  onChange,
  id,
}: {
  product: Product;
  value?: CatalogueConfiguration;
  onChange: (value: CatalogueConfiguration) => void;
  id: string;
}) {
  const template = productTemplate(product);
  const selected = Object.fromEntries(
    (value?.selections || []).map((row) => [row.key, row.value]),
  );
  const fields = productTemplates[template].fields.filter(
    (field) =>
      product.configuration_options?.[field.key]?.length || selected[field.key],
  );
  if (!fields.length) return null;
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-sm font-semibold text-brand-800">
        Especificações do produto
      </legend>
      {fields.map((field) => (
        <label
          key={field.key}
          className="block text-sm font-semibold text-brand-800"
          htmlFor={`${id}-${field.key}`}
        >
          {field.label}
          <select
            id={`${id}-${field.key}`}
            value={selected[field.key] || ""}
            onChange={(event) =>
              onChange(
                configurationSnapshot(product, {
                  ...selected,
                  [field.key]: event.target.value,
                }),
              )
            }
            className="mt-2 w-full rounded-xl border border-[#DCE5DE] bg-white p-3 text-sm"
          >
            <option value="">Selecionar / a confirmar</option>
            {Array.from(
              new Set([
                ...(product.configuration_options?.[field.key] || []),
                ...(selected[field.key] ? [selected[field.key]] : []),
              ]),
            ).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
    </fieldset>
  );
}
