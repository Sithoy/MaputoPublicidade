"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, Save, Trash2 } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { ProductOptionTags } from "./ProductOptionTags";
import { ProductCard } from "../ProductCard";
import type { Category, Product, ProductVariant } from "@/lib/api";
import type { ApparelOptions } from "@/lib/apparel";

type Version = {
  key: string;
  id?: number;
  name: string;
  sku: string;
  price: string;
  image?: string;
  file: File | null;
  clearImage?: boolean;
  active: boolean;
};
const steps = ["Identificar", "Configurar", "Condições", "Rever e guardar"];
const inputClass =
  "mt-2 w-full rounded-xl border border-[#DCE5DE] bg-white px-3 py-3 text-sm text-dark outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function versionDraft(v: ProductVariant): Version {
  return {
    key: `saved-${v.id}`,
    id: v.id,
    name: v.name,
    sku: v.sku || "",
    price: String(v.price),
    image: v.image,
    file: null,
    active: v.is_active !== false,
  };
}

function VersionImage({
  version,
  onChange,
}: {
  version: Version;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState(version.image);
  useEffect(() => {
    if (!version.file) {
      setPreview(version.clearImage ? undefined : version.image);
      return;
    }
    const url = URL.createObjectURL(version.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [version.file, version.image, version.clearImage]);
  return (
    <ImageUploader
      name={`version-${version.key}`}
      preview={preview || null}
      frame="landscape"
      onChange={onChange}
    />
  );
}

export function ProductForm({
  product,
  categories,
  onSubmit,
  loading,
  error,
}: {
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: FormData) => Promise<Product>;
  loading: boolean;
  error: string;
}) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => ({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    category: String(product?.category_id || ""),
    minimum: String(product?.min_quantity || 1),
    leadTime: product?.lead_time || "",
    price: product?.base_price == null ? "" : String(product.base_price),
    active: product?.is_active ?? false,
    featured: product?.is_featured ?? false,
  }));
  const [customSlug, setCustomSlug] = useState(Boolean(product));
  const [kind, setKind] = useState<"simple" | "options" | "apparel">(
    product?.order_template === "apparel"
      ? "apparel"
      : product?.materials?.length || product?.sizes?.length
        ? "options"
        : "simple",
  );
  const [pricing, setPricing] = useState<"fixed" | "versions" | "quote">(
    product?.pricing_complexity === "complex"
      ? "quote"
      : product?.variants?.some((v) => v.is_active !== false)
        ? "versions"
        : "fixed",
  );
  const [materials, setMaterials] = useState(product?.materials || []);
  const [sizes, setSizes] = useState(product?.sizes || []);
  const [apparel, setApparel] = useState<ApparelOptions>(() =>
    product?.apparel_options?.models?.length
      ? product.apparel_options
      : { models: [], colors: [], sizes: [], techniques: [], placements: [] },
  );
  const [versions, setVersions] = useState<Version[]>(() =>
    (product?.variants || []).map(versionDraft),
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(product?.image);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = loading || saving;
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(clearImage ? undefined : product?.image);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, product?.image, clearImage]);

  function field(key: keyof typeof draft, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function validate(section: number) {
    if (section === 0 && (!draft.name.trim() || !draft.slug.trim()))
      return "Indique o nome e um endereço válido para o produto.";
    if (section === 0 && !/^[a-zA-Z0-9_-]+$/.test(draft.slug))
      return "O endereço só pode conter letras, números, hífen e underscore.";
    if (section === 1 && kind === "apparel") {
      for (const [key, max, length, label] of [
        ["models", 3, 40, "modelos"],
        ["colors", 12, 40, "cores"],
        ["sizes", 12, 20, "tamanhos"],
        ["techniques", 8, 60, "técnicas"],
        ["placements", 8, 60, "posições"],
      ] as const) {
        const values = apparel[key] || [];
        if (
          (["models", "colors", "sizes"].includes(key) && !values.length) ||
          values.length > max ||
          values.some((v) => v.length > length)
        )
          return `Reveja ${label}: ${["models", "colors", "sizes"].includes(key) ? "pelo menos uma opção, " : ""}até ${max} opções com ${length} caracteres cada.`;
      }
    }
    if (section === 2) {
      if (versions.length > 50)
        return "Pode definir até 50 versões comerciais.";
      if (!/^\d+$/.test(draft.minimum) || Number(draft.minimum) < 1)
        return "A quantidade mínima deve ser um número inteiro positivo.";
      if (
        pricing === "fixed" &&
        (!draft.price.trim() ||
          !Number.isFinite(Number(draft.price)) ||
          Number(draft.price) < 0)
      )
        return "Indique um preço de referência válido ou escolha Sob consulta.";
      if (pricing === "versions" && !versions.some((v) => v.active))
        return "Adicione pelo menos uma versão comercial ativa.";
      if (
        pricing !== "fixed" &&
        versions.some(
          (v) =>
            !v.name.trim() ||
            !v.price.trim() ||
            !Number.isFinite(Number(v.price)) ||
            Number(v.price) < 0,
        )
      )
        return "Cada versão comercial precisa de nome e preço válidos.";
    }
    return "";
  }
  function move(target: number) {
    if (target > step)
      for (let i = 0; i < target; i++) {
        const issue = validate(i);
        if (issue) {
          setMessage(issue);
          setStep(i);
          return;
        }
      }
    setMessage("");
    setStep(target);
    heading.current?.focus();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step < 3) {
      move(step + 1);
      return;
    }
    for (let i = 0; i < 3; i++) {
      const issue = validate(i);
      if (issue) {
        setMessage(issue);
        setStep(i);
        return;
      }
    }
    setSaving(true);
    setMessage("");
    const data = new FormData();
    data.set("name", draft.name.trim());
    data.set("slug", draft.slug.trim());
    data.set("description", draft.description);
    data.set("category_id", draft.category);
    data.set("min_quantity", draft.minimum);
    data.set("lead_time", draft.leadTime);
    data.set("base_price", pricing === "fixed" ? draft.price : "");
    data.set("pricing_complexity", pricing === "quote" ? "complex" : "simple");
    data.set("materials", JSON.stringify(kind === "simple" ? [] : materials));
    // The apparel grid owns apparel sizes. Preserve legacy general sizes, but never expose a second input.
    data.set(
      "sizes",
      JSON.stringify(
        kind === "apparel"
          ? product?.sizes || []
          : kind === "simple"
            ? []
            : sizes,
      ),
    );
    data.set("order_template", kind === "apparel" ? "apparel" : "standard");
    if (kind === "apparel")
      data.set("apparel_options", JSON.stringify(apparel));
    data.set("is_active", String(draft.active));
    data.set("is_featured", String(draft.featured));
    if (imageFile) data.set("image", imageFile);
    data.set("clear_image", String(clearImage));
    const savedVersions =
      pricing === "fixed" ? versions.filter((v) => v.id) : versions;
    data.set(
      "variant_config",
      JSON.stringify(
        savedVersions.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name.trim(),
          sku: v.sku.trim(),
          price: v.price,
          is_active: pricing === "fixed" ? false : v.active,
          clear_image: v.clearImage || false,
        })),
      ),
    );
    savedVersions.forEach((v, index) => {
      if (v.file) data.set(`variant_image_${index}`, v.file);
    });
    try {
      await onSubmit(data);
      router.push("/admin/produtos");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível guardar. Os seus dados continuam neste formulário.",
      );
    } finally {
      setSaving(false);
    }
  }
  function changeVersion(key: string, change: Partial<Version>) {
    setVersions((current) =>
      current.map((v) => (v.key === key ? { ...v, ...change } : v)),
    );
  }
  const categoryName = categories.find(
    (c) => String(c.id) === draft.category,
  )?.name;
  const preview: Product = {
    id: product?.id || 0,
    slug: draft.slug,
    name: draft.name || "Nome do seu produto",
    description: draft.description,
    category: categoryName,
    image: imagePreview,
    materials,
    sizes: kind === "apparel" ? apparel.sizes : sizes,
    min_quantity: Number(draft.minimum),
    order_template: kind === "apparel" ? "apparel" : "standard",
    pricing_complexity: pricing === "quote" ? "complex" : "simple",
    base_price:
      pricing === "fixed" && draft.price.trim()
        ? Number(draft.price)
        : undefined,
    has_variants: pricing === "versions",
    starting_price:
      pricing === "versions" && versions.some((v) => v.active)
        ? Math.min(
            ...versions
              .filter((v) => v.active)
              .map((v) => Number(v.price) || 0),
          )
        : undefined,
  };
  const missing = [
    !draft.description.trim() && "descrição",
    !categoryName && "categoria",
    !imagePreview && "fotografia",
  ].filter(Boolean);

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-2xl border border-[#DCE5DE] bg-[#F4F0E8] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
          Catálogo · editor de produto
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-800">
          Uma oferta clara. Um pedido mais simples.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Defina o produto, as escolhas do cliente e as condições comerciais num
          só processo.
        </p>
      </div>
      <nav
        aria-label="Etapas do registo"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={busy}
            onClick={() => move(index)}
            aria-current={step === index ? "step" : undefined}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${step === index ? "border-brand bg-brand-800 text-white" : "border-[#DCE5DE] bg-white text-brand-800"}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs">
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            {label}
          </button>
        ))}
      </nav>
      {message || error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {message || error}
        </div>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_310px]">
        <fieldset
          disabled={busy}
          className="min-w-0 rounded-2xl border border-[#DCE5DE] bg-white p-6 sm:p-8"
        >
          <h2
            ref={heading}
            tabIndex={-1}
            className="mb-6 text-xl font-bold text-brand-800 outline-none"
          >
            {steps[step]}
          </h2>
          {step === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-brand-800 sm:col-span-2">
                Nome do produto
                <input
                  value={draft.name}
                  maxLength={255}
                  onChange={(e) => {
                    field("name", e.target.value);
                    if (!customSlug) field("slug", slugify(e.target.value));
                  }}
                  className={inputClass}
                  placeholder="Ex.: Polo de algodão"
                />
              </label>
              <label className="text-sm font-semibold text-brand-800 sm:col-span-2">
                Categoria
                <select
                  value={draft.category}
                  onChange={(e) => field("category", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecionar categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-brand-800 sm:col-span-2">
                O que o cliente deve saber?
                <textarea
                  value={draft.description}
                  onChange={(e) => field("description", e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Apresente o produto, a sua utilidade e os acabamentos."
                />
              </label>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-semibold text-brand-800">
                  Fotografia do produto
                </p>
                <ImageUploader
                  name="product-image"
                  preview={imagePreview || null}
                  frame="landscape"
                  onChange={(file) => {
                    setImageFile(file);
                    setClearImage(!file);
                  }}
                />
              </div>
              <details className="sm:col-span-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                  Endereço no catálogo ·{" "}
                  {draft.slug || "gerado a partir do nome"}
                </summary>
                <label className="mt-3 block text-sm font-semibold text-brand-800">
                  Endereço do produto
                  <input
                    value={draft.slug}
                    maxLength={280}
                    onChange={(e) => {
                      setCustomSlug(true);
                      field("slug", e.target.value);
                    }}
                    className={inputClass}
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  Ao editar, o endereço existente é mantido para não quebrar
                  links partilhados.
                </p>
              </details>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="space-y-6">
              <p className="text-sm leading-6 text-slate-500">
                Como deve o cliente especificar este produto? Isto é diferente
                de definir preços ou versões comerciais.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    [
                      "simple",
                      "Produto simples",
                      "Uma descrição e uma quantidade.",
                    ],
                    [
                      "options",
                      "Com opções",
                      "Materiais e formatos à escolha.",
                    ],
                    [
                      "apparel",
                      "Vestuário",
                      "Distribuição por modelo, cor e tamanho.",
                    ],
                  ] as const
                ).map(([value, title, description]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setKind(value)}
                    aria-pressed={kind === value}
                    className={`rounded-xl border p-4 text-left ${kind === value ? "border-brand bg-brand-50" : "border-[#DCE5DE]"}`}
                  >
                    <span className="block text-sm font-bold text-brand-800">
                      {title}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-slate-500">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
              {kind !== "simple" ? (
                <ProductOptionTags
                  id="product-materials"
                  label="Materiais disponíveis"
                  value={materials}
                  onChange={setMaterials}
                />
              ) : (
                <p className="rounded-xl bg-light p-4 text-sm text-slate-500">
                  O cliente partilha a quantidade e uma descrição. Ao guardar
                  como simples, as listas de materiais e tamanhos deixam de ser
                  opções de escolha.
                </p>
              )}
              {kind === "options" ? (
                <ProductOptionTags
                  id="product-sizes"
                  label="Formatos / tamanhos disponíveis"
                  value={sizes}
                  onChange={setSizes}
                  hint="Ex.: A4, A3 ou 2 × 1 m. Adicione apenas opções disponíveis."
                />
              ) : null}
              {kind === "apparel" ? (
                <div className="space-y-5">
                  <p className="rounded-xl border border-[#E3D6B7] bg-[#FAF7EF] p-4 text-xs leading-6 text-[#8A671E]">
                    Estas opções organizam as quantidades. Não criam stock nem
                    preços por combinação. Versões que mudam o preço são
                    definidas na próxima etapa.
                  </p>
                  {(
                    [
                      [
                        "models",
                        "Modelos",
                        "Até 3 opções. Ex.: Masculino, Feminino, Unissexo.",
                      ],
                      [
                        "colors",
                        "Cores",
                        "Até 12 cores realmente disponíveis.",
                      ],
                      [
                        "sizes",
                        "Tamanhos",
                        "Até 12 tamanhos. Ex.: S, M, L, XL.",
                      ],
                      [
                        "techniques",
                        "Técnicas de personalização",
                        "Opcional. Ex.: Bordado, Impressão.",
                      ],
                      [
                        "placements",
                        "Posições de personalização",
                        "Opcional. Ex.: Peito esquerdo, Costas.",
                      ],
                    ] as const
                  ).map(([key, label, hint]) => (
                    <ProductOptionTags
                      key={key}
                      id={`apparel-${key}`}
                      label={label}
                      hint={hint}
                      value={apparel[key] || []}
                      onChange={(values) =>
                        setApparel((current) => ({ ...current, [key]: values }))
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-6">
              <label className="block text-sm font-semibold text-brand-800">
                Como é definido o preço?
                <select
                  value={pricing}
                  onChange={(e) => setPricing(e.target.value as typeof pricing)}
                  className={inputClass}
                >
                  <option value="fixed">Preço único de referência</option>
                  <option value="versions">Preço por versão comercial</option>
                  <option value="quote">Sob consulta · orçamento manual</option>
                </select>
              </label>
              {pricing === "fixed" ? (
                <label className="block text-sm font-semibold text-brand-800">
                  Preço de referência (MZN)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.price}
                    onChange={(e) => field("price", e.target.value)}
                    className={inputClass}
                  />
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    As versões existentes ficam inativas ao guardar com preço
                    único; o histórico é preservado.
                  </span>
                </label>
              ) : null}
              {pricing === "quote" ? (
                <p className="rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-800">
                  O catálogo mostra “Sob consulta”. A Recepção prepara o valor
                  na proposta. Versões existentes são preservadas, sem preço
                  público.
                </p>
              ) : null}
              {pricing === "versions" ||
              (versions.length > 0 && pricing === "quote") ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-brand-800">
                      Versões comerciais
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Use para diferenças reais de oferta ou preço, como tecido
                      standard e premium. Não replique todas as cores e tamanhos
                      aqui.
                    </p>
                  </div>
                  {versions.map((v, index) => (
                    <div
                      key={v.key}
                      className="space-y-4 rounded-xl border border-[#DCE5DE] bg-light p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-800">
                          Versão {index + 1}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover versão ${index + 1}`}
                          onClick={() =>
                            setVersions((current) =>
                              current.filter((row) => row.key !== v.key),
                            )
                          }
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-semibold text-brand-800">
                          Nome da versão
                          <input
                            value={v.name}
                            maxLength={255}
                            onChange={(e) =>
                              changeVersion(v.key, { name: e.target.value })
                            }
                            className={inputClass}
                          />
                        </label>
                        <label className="text-sm font-semibold text-brand-800">
                          Preço (MZN)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.price}
                            onChange={(e) =>
                              changeVersion(v.key, { price: e.target.value })
                            }
                            className={inputClass}
                          />
                        </label>
                        <label className="text-sm font-semibold text-brand-800">
                          Referência interna (opcional)
                          <input
                            value={v.sku}
                            maxLength={100}
                            onChange={(e) =>
                              changeVersion(v.key, { sku: e.target.value })
                            }
                            className={inputClass}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-brand-800">
                          <input
                            type="checkbox"
                            checked={v.active}
                            onChange={(e) =>
                              changeVersion(v.key, { active: e.target.checked })
                            }
                          />
                          Disponível para novos pedidos
                        </label>
                      </div>
                      <VersionImage
                        version={v}
                        onChange={(file) =>
                          changeVersion(v.key, { file, clearImage: !file })
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setVersions((current) => [
                        ...current,
                        {
                          key: crypto.randomUUID(),
                          name: "",
                          sku: "",
                          price: "",
                          file: null,
                          active: true,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5DE] px-4 py-3 text-sm font-semibold text-brand-800"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar versão comercial
                  </button>
                </div>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-brand-800">
                  Quantidade mínima
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={draft.minimum}
                    onChange={(e) => field("minimum", e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-semibold text-brand-800">
                  Prazo estimado
                  <input
                    value={draft.leadTime}
                    maxLength={100}
                    onChange={(e) => field("leadTime", e.target.value)}
                    placeholder="Ex.: 5–7 dias úteis"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="space-y-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Produto", draft.name],
                  ["Categoria", categoryName || "Sem categoria"],
                  [
                    "Configuração",
                    kind === "apparel"
                      ? "Distribuição de vestuário"
                      : kind === "options"
                        ? "Materiais e formatos"
                        : "Produto simples",
                  ],
                  [
                    "Preço",
                    pricing === "quote"
                      ? "Sob consulta"
                      : pricing === "versions"
                        ? "Por versão comercial"
                        : `${draft.price} MZN`,
                  ],
                  ["Quantidade mínima", draft.minimum],
                  ["Prazo estimado", draft.leadTime || "A confirmar"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 text-sm font-bold text-brand-800">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {kind === "apparel" ? (
                <div className="rounded-xl bg-brand-50 p-4 text-sm leading-7 text-brand-800">
                  <p>{apparel.models.join(" · ")}</p>
                  <p>{apparel.colors.join(" · ")}</p>
                  <p>{apparel.sizes.join(" · ")}</p>
                  <p className="mt-2 text-xs">
                    O cliente poderá distribuir quantidades por estas
                    combinações, sem criar artigos manualmente.
                  </p>
                </div>
              ) : null}
              {missing.length ? (
                <p className="rounded-xl border border-[#E3D6B7] bg-[#FAF7EF] p-4 text-sm leading-6 text-[#8A671E]">
                  Para uma apresentação mais completa, falta:{" "}
                  {missing.join(", ")}. Pode guardar agora e completar depois.
                </p>
              ) : null}
              <label className="flex items-start gap-3 rounded-xl border border-[#DCE5DE] p-4">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => field("active", e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-bold text-brand-800">
                    Visível no catálogo público
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Desative para guardar como rascunho. Produtos existentes
                    mantêm o estado atual.
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-3 text-sm text-brand-800">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => field("featured", e.target.checked)}
                />
                Destacar este produto
              </label>
              <p className="text-xs leading-6 text-slate-500">
                Produto, opções, imagens e versões são guardados em conjunto.
                Versões removidas ficam inativas, preservando referências
                históricas.
              </p>
            </div>
          ) : null}
        </fieldset>
        <aside className="space-y-3 lg:sticky lg:top-24">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Assim aparece no catálogo
          </p>
          <div
            className="pointer-events-none"
            ref={(element) => {
              element?.setAttribute("inert", "");
            }}
          >
            <ProductCard product={preview} />
          </div>
          <p className="text-xs leading-6 text-slate-500">
            Pré-visualização. As imagens e descrições são as que o cliente verá.
          </p>
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCE5DE] bg-white p-4">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            step ? move(step - 1) : router.push("/admin/produtos")
          }
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
          {step ? "Anterior" : "Cancelar"}
        </button>
        <span className="text-xs text-slate-500">Etapa {step + 1} de 4</span>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {step < 3
            ? "Continuar"
            : busy
              ? "A guardar..."
              : draft.active
                ? "Guardar e publicar"
                : "Guardar rascunho"}
          {step < 3 ? (
            <ArrowRight className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );
}
