import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortfolioGallery } from "./PortfolioGallery";

vi.mock("next/image", () => ({
  default: ({ alt, onError }: { alt: string; onError?: () => void }) => (

    <img alt={alt} onError={onError} />
  ),
}));
const items = [
  {
    id: 1,
    slug: "frota",
    title: "Frota comercial",
    category_name: "Impressão Digital e Branding",
    client_name: "Empresa Exemplo",
    image: "/media/frota.jpg",
    description: "Aplicação de vinil nas viaturas da equipa.",
  },
  {
    id: 2,
    slug: "polos",
    title: "Polos bordados",
    category_name: "Serigrafia e Bordado",
    image: "/media/polos.jpg",
  },
  {
    id: 3,
    slug: "cartoes",
    title: "Cartões de visita",
    category_name: "Gráfica",
  },
];
const fetcher = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockReset();
  fetcher.mockResolvedValue({
    ok: true,
    json: async () => ({ results: items, next: null }),
  });
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});
describe("Portfolio workspace for visitors", () => {
  it("uses recorded categories, searches accents and shows a neutral missing-photo state", async () => {
    render(<PortfolioGallery variant="page" />);
    await screen.findByRole("button", {
      name: "Abrir projeto: Frota comercial",
    });
    expect(screen.getByText("Fotografia por adicionar")).toBeInTheDocument();
    expect(screen.queryByText(/Trabalhos reais/)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Uniformes" }),
    );
    expect(
      screen.getByRole("button", { name: "Abrir projeto: Polos bordados" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Abrir projeto: Frota comercial" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "cartoes" },
    });
    expect(
      screen.getByRole("button", { name: "Abrir projeto: Cartões de visita" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Abrir projeto: Polos bordados" }),
    ).not.toBeInTheDocument();
  });
  it("opens complete recorded details and restores focus after closing", async () => {
    render(<PortfolioGallery variant="page" />);
    const trigger = await screen.findByRole("button", {
      name: "Abrir projeto: Frota comercial",
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Frota comercial" });
    expect(within(dialog).getByText("Empresa Exemplo")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Aplicação de vinil nas viaturas da equipa."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText("Conclusão")).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Fechar projeto" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("allows escape cancellation and never replaces broken photos with illustrative work", async () => {
    render(<PortfolioGallery />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Abrir projeto: Frota comercial",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.error(within(dialog).getByRole("img"));
    expect(
      within(dialog).getByText("Fotografia indisponível"),
    ).toBeInTheDocument();
    fireEvent(
      dialog,
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("fetches additional pages through its own public endpoint and deduplicates records", async () => {
    fetcher.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [items[0]],
        next: "https://backend.example/api/portfolio/?page=2",
      }),
    });
    fetcher.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [items[0], items[1]], next: null }),
    });
    render(<PortfolioGallery />);
    await screen.findByRole("button", {
      name: "Abrir projeto: Polos bordados",
    });
    expect(fetcher.mock.calls[1][0]).toBe("/api/portfolio/?page=2");
    expect(
      screen.getAllByRole("button", { name: /Abrir projeto:/ }),
    ).toHaveLength(2);
  });
  it("distinguishes request failures from empty content and can retry", async () => {
    fetcher.mockRejectedValueOnce(new Error("Falha de ligação"));
    render(<PortfolioGallery />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falha de ligação",
    );
    expect(
      screen.queryByText("Ainda não existem projetos publicados."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("button", {
      name: "Abrir projeto: Frota comercial",
    });
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
  it("labels known illustrative assets and keeps the landing section limited", async () => {
    fetcher.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { ...items[0], image: "/images/brand/portfolio-vehicle.jpg" },
          items[1],
        ],
        next: null,
      }),
    });
    render(<PortfolioGallery limit={1} />);
    await screen.findByText("Imagem ilustrativa");
    expect(
      screen.getAllByRole("button", { name: /Abrir projeto:/ }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Ver todos os projetos" }),
    ).toHaveAttribute("href", "/portfolio");
  });
});
