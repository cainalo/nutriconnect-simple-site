// Compras nos mercados parceiros (R1): a busca do produto no parceiro escolhido, com o código de
// afiliado da plataforma; cada clique é contado no banco. O admin cadastra os parceiros.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type MarketPartner = Tables<"market_partners">;
export type MarketSource = "receita" | "lista" | "plano" | "cardapio" | "lancheira";
export type MarketStat = Database["public"]["Functions"]["admin_market_stats"]["Returns"][number];

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const marketKeys = {
  all: ["markets"] as const,
  partners: (all: boolean) => ["markets", "partners", all] as const,
  stats: (days: number) => ["markets", "stats", days] as const,
};

/** Parceiros (ativos; com `all`, também os inativos — só para o admin). */
export function useMarketPartners(all = false) {
  return useQuery({
    queryKey: marketKeys.partners(all),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MarketPartner[]> => {
      let q = supabase.from("market_partners").select("*");
      if (!all) q = q.eq("active", true);
      const { data, error } = await q.order("position").order("name");
      fail(error);
      return data ?? [];
    },
  });
}

/** Tira a quantidade ("2 xícaras de arroz" → "arroz") para a busca achar o produto. */
export function productQuery(text: string) {
  return text
    .replace(/\(.*?\)/g, " ")
    .replace(
      /^\s*(?:[\d½¼¾.,/]+\s*)?(?:(?:x[ií]caras?|colher(?:es)?(?:\s+de\s+(?:sopa|ch[aá]|sobremesa))?|copos?|latas?|pacotes?|unidades?|ma[cç]os?|dentes?|fatias?|pitadas?|kg|g|gramas?|ml|l|litros?)\s+(?:de\s+)?)?/i,
      "",
    )
    .replace(/\b(?:a gosto|picad[oa]s?|ralad[oa]s?|cozid[oa]s?|em cubos)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Abre a busca no parceiro (a aba é aberta na hora para o navegador não bloquear). */
export async function openMarket(partnerId: string, source: MarketSource, item: string) {
  const tab = window.open("about:blank", "_blank");
  try {
    const { data, error } = await supabase.rpc("market_click", {
      p_partner: partnerId,
      p_source: source,
      p_query: productQuery(item) || item.slice(0, 120),
    });
    fail(error);
    if (tab) tab.location.href = data as string;
    else window.location.href = data as string;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

export function useMarketStats(days = 30) {
  return useQuery({
    queryKey: marketKeys.stats(days),
    queryFn: async (): Promise<MarketStat[]> => {
      const { data, error } = await supabase.rpc("admin_market_stats", { p_days: days });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSavePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<MarketPartner> & { name: string; search_url: string }) => {
      const row = {
        name: p.name.trim(),
        search_url: p.search_url.trim(),
        emoji: p.emoji || "🛒",
        active: p.active ?? true,
        position: p.position ?? 0,
        states: p.states ?? [],
      };
      const { error } = p.id
        ? await supabase.from("market_partners").update(row).eq("id", p.id)
        : await supabase.from("market_partners").insert(row);
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: marketKeys.all }),
  });
}

export function useDeletePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("market_partners").delete().eq("id", id);
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: marketKeys.all }),
  });
}
