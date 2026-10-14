"use client";

import { createContext, useEffect, useState } from "react";
import { getClientQuotes } from "@/lib/client-api";
import { fetchWithAuth } from "@/lib/auth";
import { countPendingDecisions } from "@/lib/branddesk-navigation";
export const BrandDeskActivityContext = createContext<{
  approvals: number | null;
  messages: number | null;
}>({ approvals: null, messages: null });

export function useBrandDeskActivity(
  userId: number | undefined,
  pathname: string,
) {
  const [counts, setCounts] = useState<{
    approvals: number | null;
    messages: number | null;
  }>({ approvals: null, messages: null });
  useEffect(() => {
    setCounts({ approvals: null, messages: null });
    if (!userId) return;
    const controller = new AbortController();
    let busy = false;
    async function load() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      async function messages() {
        let next: string | null = "/api/support-conversations/";
        let total = 0;
        const visited = new Set<string>();
        while (next) {
          if (visited.has(next) || visited.size >= 100)
            throw new Error("Incomplete inbox");
          visited.add(next);
          const page = await fetchWithAuth(next, { signal: controller.signal });
          if (!Array.isArray(page.results)) throw new Error("Invalid inbox");
          total += page.results.reduce(
            (sum: number, item: { unread_count?: number }) =>
              sum + Math.max(0, item.unread_count ?? 0),
            0,
          );
          if (!page.next) break;
          const url = new URL(page.next, window.location.origin);
          if (url.pathname !== "/api/support-conversations/")
            throw new Error("Invalid inbox page");
          next = url.pathname + url.search;
        }
        return total;
      }
      const [quotes, inbox] = await Promise.allSettled([
        getClientQuotes(),
        messages(),
      ]);
      if (!controller.signal.aborted)
        setCounts({
          approvals:
            quotes.status === "fulfilled"
              ? countPendingDecisions(quotes.value)
              : null,
          messages: inbox.status === "fulfilled" ? inbox.value : null,
        });
      busy = false;
    }
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [userId, pathname]);
  return counts;
}
