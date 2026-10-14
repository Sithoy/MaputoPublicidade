export const brandDeskNavigation = [
  { href: "/area-cliente", label: "Visão geral", section: "workspace" },
  {
    href: "/area-cliente/orcamentos",
    label: "Pedidos e propostas",
    section: "workspace",
  },
  {
    href: "/area-cliente/encomendas",
    label: "Projetos e entregas",
    section: "workspace",
  },
  {
    href: "/area-cliente/aprovacoes",
    label: "Aprovações",
    section: "workspace",
  },
  { href: "/area-cliente/apoio", label: "Mensagens", section: "workspace" },
  {
    href: "/area-cliente/faturas",
    label: "Faturas e pagamentos",
    section: "workspace",
  },
  {
    href: "/area-cliente/marca",
    label: "Biblioteca da marca",
    section: "company",
  },
  {
    href: "/area-cliente/historico",
    label: "Histórico de trabalhos",
    section: "company",
  },
  {
    href: "/area-cliente/perfil",
    label: "Perfil da empresa",
    section: "company",
  },
] as const;

export function isBrandDeskRouteActive(pathname: string, href: string) {
  return href === "/area-cliente"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function countPendingDecisions(
  quotes: Array<{
    status: string;
    price_approved_at?: string | null;
    artwork?: { status: string } | null;
  }>,
) {
  return quotes.reduce(
    (total, quote) =>
      total +
      Number(quote.status === "quoted" && !quote.price_approved_at) +
      Number(
        quote.status !== "cancelled" && quote.artwork?.status === "pending",
      ),
    0,
  );
}
