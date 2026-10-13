import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductForm } from "./ProductForm";
import type { Product } from "@/lib/api";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./ImageUploader", () => ({
  ImageUploader: () => <span>Fotografia</span>,
}));
vi.mock("../ProductCard", () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <span>Preview: {product.name}</span>
  ),
}));
function mount(
  product?: Product,
  submit = vi.fn().mockResolvedValue({ id: 1 }),
) {
  render(
    <ProductForm
      product={product}
      categories={[{ id: 5, name: "Vestuário", slug: "vestuario" }]}
      onSubmit={submit}
      loading={false}
      error=""
    />,
  );
  return submit;
}
function next() {
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}
function add(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: `Adicionar: ${label}` }));
}

describe("Unified product editor", () => {
  it("generates a slug, saves a draft with one request and no public price for consultation", async () => {
    const submit = mount();
    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: "Polo de Algodão" },
    });
    fireEvent.change(screen.getByLabelText("Categoria"), {
      target: { value: "5" },
    });
    next();
    next();
    fireEvent.change(screen.getByLabelText("Como é definido o preço?"), {
      target: { value: "quote" },
    });
    next();
    fireEvent.click(screen.getByRole("button", { name: "Guardar rascunho" }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    const data = submit.mock.calls[0][0] as FormData;
    expect(data.get("slug")).toBe("polo-de-algodao");
    expect(data.get("is_active")).toBe("false");
    expect(data.get("base_price")).toBe("");
    expect(data.get("variant_config")).toBe("[]");
  });
  it("shows only apparel sizes and preserves the configuration through navigation", () => {
    mount({
      id: 1,
      name: "Polo",
      slug: "polo",
      description: "",
      order_template: "apparel",
      apparel_options: {
        models: ["Masculino"],
        colors: ["Verde"],
        sizes: ["M"],
      },
    });
    next();
    expect(
      screen.queryByLabelText("Formatos / tamanhos disponíveis"),
    ).not.toBeInTheDocument();
    add("Tamanhos", "L");
    next();
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByText("L", { exact: true })).toBeInTheDocument();
  });
  it("preserves legacy slug and category while saving existing versions together", async () => {
    const submit = mount({
      id: 1,
      name: "Polo",
      slug: "old-shared-url",
      description: "",
      category_id: 5,
      variants: [{ id: 9, name: "Premium", price: 200 }],
    });
    expect(screen.getByLabelText("Categoria")).toHaveValue("5");
    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: "Polo novo" },
    });
    next();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Guardar rascunho" }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    const data = submit.mock.calls[0][0] as FormData;
    expect(data.get("slug")).toBe("old-shared-url");
    expect(JSON.parse(String(data.get("variant_config")))[0]).toMatchObject({
      id: 9,
      name: "Premium",
      price: "200",
      is_active: true,
    });
  });
  it("does not let review bypass required commercial fields and preserves data on failure", async () => {
    const submit = mount(
      undefined,
      vi.fn().mockRejectedValue(new Error("Falha de ligação")),
    );
    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: "Cartões" },
    });
    next();
    next();
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("preço de referência");
    fireEvent.change(screen.getByLabelText(/Preço de referência \(MZN\)/), {
      target: { value: "100" },
    });
    next();
    fireEvent.click(screen.getByRole("button", { name: "Guardar rascunho" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Falha de ligação"),
    );
    expect(screen.getByText("Cartões", { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByLabelText(/Preço de referência \(MZN\)/)).toHaveValue(
      100,
    );
  });
});
