import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { WhyTrustSection } from "./WhyTrustSection";

describe("Responsive trust photography", () => {
  it("offers an optimized desktop portrait and a mobile landscape without duplicating the image", () => {
    render(<WhyTrustSection />);
    const image = screen.getByRole("img", { name: /rever materiais de marca/ });
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(image.getAttribute("src")).toContain("trust-project-review-landscape.webp");
    const source = image.closest("picture")?.querySelector("source");
    expect(source).toHaveAttribute("media", "(min-width: 1024px)");
    expect(source?.getAttribute("srcset")).toContain(
      "trust-project-review-portrait.webp",
    );
    expect(source?.getAttribute("srcset")).toContain("/_next/image?");
    expect(
      existsSync(
        resolve(process.cwd(), "public/images/trust-project-review-portrait.webp"),
      ),
    ).toBe(true);
    expect(image.closest("picture")?.parentElement).toHaveClass(
      "aspect-[3/2]",
      "lg:aspect-[4/5]",
    );
  });

  it("keeps the caption below the mobile photograph and descriptive illustrative alt text", () => {
    render(<WhyTrustSection />);
    const caption = screen.getByText("A qualidade final começa muito antes da entrega.");
    expect(screen.getByRole('img').getAttribute('alt')).toContain('Imagem ilustrativa');
    expect(caption.parentElement).toHaveClass("lg:absolute");
    expect(caption.parentElement).not.toHaveClass("absolute");
    expect(screen.queryByText(/Trabalho real/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });
});
