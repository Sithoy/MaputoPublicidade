"use client";

import { useEffect, useState } from "react";
import { getProductCategories, saveProductCategory } from "@/lib/admin-api";
import type { ProductCategory } from "@/lib/api";
import type { ApparelOptions } from "@/lib/apparel";
import { ProductOptionTags } from "./ProductOptionTags";
import {
  productTemplates,
  type ProductTemplate,
} from "@/lib/product-configuration";

export function ProductCategorySettings() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<ProductTemplate>("standard");
  const [options, setOptions] = useState<Partial<Record<ProductTemplate, Record<string, string[]>>>>({});
  const [apparel, setApparel] = useState<ApparelOptions>({ models: [], colors: [], sizes: [], techniques: [], placements: [] });
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    getProductCategories()
      .then(setCategories)
      .catch(() =>
        setError("Não foi possível carregar as categorias de produtos."),
      );
  }, []);
  function edit(category: ProductCategory | null) {
    setEditing(category);
    setName(category?.name || "");
    setDescription(category?.description || "");
    setTemplate(category?.configuration_template || "standard");
    setOptions(category ? { [category.configuration_template]: category.configuration_options || {} } : {});
    setApparel({ models: [], colors: [], sizes: [], techniques: [], placements: [], ...category?.apparel_options });
    setActive(category?.is_active ?? true);
    setNotice("");
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveProductCategory(
        {
          name: name.trim(),
          description,
          configuration_template: template,
          configuration_options: options[template] || {},
          apparel_options: template === "apparel" && Object.values(apparel).some((values) => values?.length) ? apparel : {},
          is_active: active,
          ...(editing
            ? {}
            : {
                slug: name
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, ""),
              }),
        },
        editing?.slug,
      );
      setCategories(await getProductCategories());
      edit(null);
      setNotice("Categoria guardada. Produtos que herdam esta configuração foram atualizados; personalizações e pedidos anteriores foram preservados.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível guardar a categoria.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#DCE5DE] bg-[#F4F0E8] p-6">
        <h2 className="text-xl font-bold text-brand-800">
          Organize o que o cliente pode encomendar.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Defina aqui o modelo e as opções comuns. Os produtos herdam esta configuração
          automaticamente, salvo quando têm uma personalização própria. Pedidos e propostas anteriores mantêm os detalhes registados.
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800"
        >
          {notice}
        </p>
      ) : null}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-[#DCE5DE] bg-white p-6"
      >
        <h2 className="font-bold text-brand-800">
          {editing
            ? "Editar categoria de produto"
            : "Nova categoria de produto"}
        </h2>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Nome
            <input
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Modelo de configuração
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as ProductTemplate)}
              className="mt-2 w-full rounded-xl border bg-white p-3"
            >
              {Object.entries(productTemplates).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Descrição
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          <p className="text-xs leading-6 text-slate-500 sm:col-span-2">
            {template === "apparel"
              ? "Modelo, cor, tamanho e distribuição de quantidades."
              : productTemplates[template].fields
                  .map((field) => field.label)
                  .join(" · ") ||
                "Descrição e quantidade, sem campos específicos."}
          </p>
          <div className="space-y-4 sm:col-span-2">
            {template === "apparel" ? ([
              ["models", "Modelos", "Até 3 opções. Ex.: Masculino, Feminino, Unissexo."],
              ["colors", "Cores", "Até 12 cores."],
              ["sizes", "Tamanhos", "Até 12 tamanhos."],
              ["techniques", "Técnicas de personalização", "Até 8 técnicas; opcional."],
              ["placements", "Posições de personalização", "Até 8 posições; opcional."],
            ] as const).map(([key, label, hint]) => <ProductOptionTags key={key} id={`category-${key}`} label={label} hint={hint} value={apparel[key] || []} onChange={(values) => setApparel((current) => ({ ...current, [key]: values }))} />)
              : null}
            {productTemplates[template].fields.map((field) => <ProductOptionTags key={`${template}-${field.key}`} id={`category-${field.key}`} label={field.label} hint="Até 20 opções. Deixe vazio se não se aplica à categoria." value={options[template]?.[field.key] || []} onChange={(values) => setOptions((current) => ({ ...current, [template]: { ...current[template], [field.key]: values } }))} />)}
            <p className="text-xs leading-6 text-slate-500">Use apenas opções reais. Produtos com disponibilidade diferente podem personalizar estas listas. Preços e versões comerciais continuam definidos no produto.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Disponível para classificar novos produtos
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white"
            >
              {busy ? "A guardar..." : "Guardar categoria"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => edit(null)}
                className="rounded-xl border px-5 py-3 text-sm"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </fieldset>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            disabled={busy}
            onClick={() => edit(category)}
            className="rounded-2xl border border-[#DCE5DE] bg-white p-5 text-left hover:border-brand"
          >
            <span className="block font-bold text-brand-800">
              {category.name}
            </span>
            <span className="mt-2 block text-sm text-slate-500">
              {productTemplates[category.configuration_template].label}
            </span>
            <span className="mt-3 block text-xs font-semibold text-brand">
              {category.is_active ? "Ativa · editar" : "Arquivada · editar"}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs leading-6 text-slate-500">
        Novos produtos herdam por defeito. Produtos anteriores mantêm a sua configuração até escolher “Usar configuração da categoria” no editor.
        {" "}
        Para retirar uma categoria, desative-a. As ligações e o histórico dos
        produtos são preservados.
      </p>
    </div>
  );
}
