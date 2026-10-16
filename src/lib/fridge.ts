// Geladeira (N4) e lista de compras na conta: receitas guardadas, receitas da comunidade pelos
// ingredientes e itens de compra (valem em todos os aparelhos; quem mora numa casa usa a lista da casa).
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type { FridgeRecipe } from "@/lib/fridge.functions";
import { useMyHousehold } from "@/lib/household";

export type SavedRecipe = Tables<"saved_recipes">;
export type ShoppingItem = Tables<"shopping_items">;
export type CommunityRecipe = {
  id: string;
  title: string | null;
  image_url: string | null;
  author_id: string;
  recipe: Json;
  matches: number;
};

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const fridgeKeys = {
  saved: ["fridge", "saved"] as const,
  shopping: ["shopping"] as const,
  community: (terms: string[]) => ["fridge", "community", terms] as const,
};

/** Ingredientes que a pessoa marcou na Geladeira antes de irem para a conta (neste aparelho). */
const fridgeItemsKey = (userId: string) => `nc_fridge_items_${userId}`;

function readLocalFridge(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(fridgeItemsKey(userId));
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    return list.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeLocalFridge(userId: string, items: string[] | null) {
  try {
    if (items) window.localStorage.setItem(fridgeItemsKey(userId), JSON.stringify(items));
    else window.localStorage.removeItem(fridgeItemsKey(userId));
  } catch {
    /* sem armazenamento */
  }
}

export const FRIDGE_MAX = 30;

/**
 * Ingredientes da Geladeira: na conta (a da casa, para quem mora numa, em tempo real) e, se o banco
 * ainda não tiver a tabela, neste aparelho como antes. O que estava só no aparelho sobe uma vez.
 */
export function useFridgeItems(userId: string | undefined) {
  const qc = useQueryClient();
  const house = useMyHousehold(userId);
  const houseId = house.data?.house.id ?? null;
  const key = ["fridge-items", houseId ?? "pessoal"] as const;

  const query = useQuery({
    queryKey: key,
    enabled: !!userId && !house.isLoading,
    retry: false,
    queryFn: async (): Promise<{ id: string; text: string }[]> => {
      let q = supabase.from("fridge_items").select("id, text");
      q = houseId ? q.eq("household_id", houseId) : q.is("household_id", null);
      const { data, error } = await q.order("created_at", { ascending: true });
      fail(error);
      const rows = data ?? [];
      // Primeira vez com a geladeira na conta: sobe o que estava neste aparelho.
      const local = readLocalFridge(userId!);
      if (local.length) {
        const have = new Set(rows.map((r) => r.text.toLowerCase()));
        const fresh = local.filter((t) => !have.has(t.toLowerCase())).slice(0, FRIDGE_MAX);
        if (fresh.length) {
          const { data: added } = await supabase
            .from("fridge_items")
            .insert(
              fresh.map((text) => ({
                user_id: userId!,
                text,
                ...(houseId ? { household_id: houseId } : {}),
              })),
            )
            .select("id, text");
          rows.push(...(added ?? []));
        }
        writeLocalFridge(userId!, null);
      }
      return rows;
    },
  });

  // Sem a tabela no banco: segue no aparelho.
  const offline = query.isError;
  const [localItems, setLocalItems] = useState<string[]>([]);
  useEffect(() => {
    if (offline && userId) setLocalItems(readLocalFridge(userId));
  }, [offline, userId]);

  const rows = query.data ?? [];
  const items = offline ? localItems : rows.map((r) => r.text);
  const refresh = () => qc.invalidateQueries({ queryKey: ["fridge-items"] });

  const add = async (texts: string[]) => {
    const seen = new Set(items.map((i) => i.toLowerCase()));
    const fresh = texts
      .map((t) => t.trim().toLowerCase().slice(0, 40))
      .filter((t) => t && !seen.has(t) && (seen.add(t), true))
      .slice(0, Math.max(0, FRIDGE_MAX - items.length));
    if (!fresh.length || !userId) return 0;
    if (offline) {
      const next = [...items, ...fresh];
      setLocalItems(next);
      writeLocalFridge(userId, next);
      return fresh.length;
    }
    const { error } = await supabase.from("fridge_items").insert(
      fresh.map((text) => ({
        user_id: userId,
        text,
        ...(houseId ? { household_id: houseId } : {}),
      })),
    );
    await refresh();
    fail(error);
    return fresh.length;
  };

  const removeMany = async (texts: string[]) => {
    if (!userId) return;
    if (offline) {
      const next = items.filter((i) => !texts.includes(i));
      setLocalItems(next);
      writeLocalFridge(userId, next);
      return;
    }
    const ids = rows.filter((r) => texts.includes(r.text)).map((r) => r.id);
    qc.setQueryData<typeof rows>(key, (old) => old?.filter((r) => !ids.includes(r.id)));
    if (ids.length) {
      const { error } = await supabase.from("fridge_items").delete().in("id", ids);
      await refresh();
      fail(error);
    }
  };

  return {
    items,
    loading: query.isLoading,
    shared: !!houseId && !offline,
    add,
    remove: (text: string) => removeMany([text]),
    clear: () => removeMany(items),
  };
}

// ---------------------------------------------------------------------------
// Ingredientes comuns (um toque)
// ---------------------------------------------------------------------------

export const COMMON_INGREDIENTS: [string, string, string, string][] = [
  ["arroz", "rice", "arroz", "riz"],
  ["feijão", "beans", "frijoles", "haricots"],
  ["ovo", "egg", "huevo", "œuf"],
  ["tomate", "tomato", "tomate", "tomate"],
  ["cebola", "onion", "cebolla", "oignon"],
  ["alho", "garlic", "ajo", "ail"],
  ["batata", "potato", "papa", "pomme de terre"],
  ["cenoura", "carrot", "zanahoria", "carotte"],
  ["abobrinha", "zucchini", "calabacín", "courgette"],
  ["frango", "chicken", "pollo", "poulet"],
  ["banana", "banana", "plátano", "banane"],
  ["aveia", "oats", "avena", "flocons d'avoine"],
  ["leite", "milk", "leche", "lait"],
  ["queijo", "cheese", "queso", "fromage"],
  ["pão", "bread", "pan", "pain"],
  ["macarrão", "pasta", "pasta", "pâtes"],
];

// ---------------------------------------------------------------------------
// Receitas guardadas
// ---------------------------------------------------------------------------

export function useSavedRecipes(enabled = true) {
  return useQuery({
    queryKey: fridgeKeys.saved,
    enabled,
    queryFn: async (): Promise<SavedRecipe[]> => {
      const { data, error } = await supabase
        .from("saved_recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveRecipe(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        { source: "nina"; recipe: FridgeRecipe } | { source: "comunidade"; post: CommunityRecipe },
    ) => {
      const row: TablesInsert<"saved_recipes"> =
        input.source === "nina"
          ? {
              user_id: userId!,
              source: "nina",
              title: input.recipe.title,
              recipe: input.recipe as unknown as Json,
            }
          : {
              user_id: userId!,
              source: "comunidade",
              post_id: input.post.id,
              title: (input.post.title || "Receita").slice(0, 150),
              recipe: input.post.recipe,
            };
      const { error } = await supabase.from("saved_recipes").insert(row);
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fridgeKeys.saved }),
  });
}

export function useDeleteSavedRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_recipes").delete().eq("id", id);
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fridgeKeys.saved }),
  });
}

// ---------------------------------------------------------------------------
// Receitas da comunidade
// ---------------------------------------------------------------------------

export function useCommunityRecipes(terms: string[], enabled: boolean) {
  return useQuery({
    queryKey: fridgeKeys.community(terms),
    enabled: enabled && terms.length > 0,
    queryFn: async (): Promise<CommunityRecipe[]> => {
      const { data, error } = await supabase.rpc("recipes_with_ingredients", {
        p_terms: terms,
        p_limit: 6,
      });
      fail(error);
      return (data ?? []) as CommunityRecipe[];
    },
  });
}

// ---------------------------------------------------------------------------
// Lista de compras na conta (ou da casa, para quem está num grupo familiar)
// ---------------------------------------------------------------------------

/** Chave da lista que a pessoa vê agora: a da casa ou a pessoal. */
const shoppingKey = (houseId: string | null | undefined) =>
  [...fridgeKeys.shopping, houseId ?? "pessoal"] as const;

/**
 * A lista de compras: a da casa, se a pessoa mora numa (os itens pessoais ficam guardados e voltam
 * quando ela sai), ou a pessoal. A da casa se atualiza em tempo real.
 */
export function useShoppingItems(userId: string | undefined) {
  const house = useMyHousehold(userId);
  const houseId = house.data?.house.id ?? null;
  return useQuery({
    queryKey: shoppingKey(houseId),
    enabled: !!userId && !house.isLoading,
    queryFn: async (): Promise<ShoppingItem[]> => {
      let query = supabase.from("shopping_items").select("*");
      // Fora de uma casa o RLS já mostra só a lista pessoal (e o filtro não depende da coluna nova).
      if (houseId) query = query.eq("household_id", houseId);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
      fail(error);
      return data ?? [];
    },
  });
}

/** Item para a lista: só o texto ou o texto com a seção do mercado. */
export type ShoppingEntry = string | { text: string; section?: string | null };

/** Adiciona itens (sem repetir o que já está na lista e ainda não foi comprado). */
export async function addShoppingItems(
  userId: string,
  entries: ShoppingEntry[],
  source: ShoppingItem["source"] = "manual",
  current: ShoppingItem[] = [],
  householdId: string | null = null,
) {
  const open = new Set(current.filter((i) => !i.done).map((i) => i.text.trim().toLowerCase()));
  const seen = new Set<string>();
  const rows = entries
    .map((e) => (typeof e === "string" ? { text: e } : e))
    .map((e) => ({ text: e.text.trim().slice(0, 80), section: e.section ?? null }))
    .filter((e) => {
      const k = e.text.toLowerCase();
      if (!e.text || open.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((e) => ({
      user_id: userId,
      ...(householdId ? { household_id: householdId } : {}),
      text: e.text,
      section: e.section,
      source,
    }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("shopping_items").insert(rows);
  fail(error);
  return rows.length;
}

export function useAddShoppingItems(userId: string | undefined) {
  const qc = useQueryClient();
  const house = useMyHousehold(userId);
  const houseId = house.data?.house.id ?? null;
  return useMutation({
    mutationFn: ({ texts, source }: { texts: ShoppingEntry[]; source?: ShoppingItem["source"] }) =>
      addShoppingItems(
        userId!,
        texts,
        source,
        qc.getQueryData<ShoppingItem[]>(shoppingKey(houseId)) ?? [],
        houseId,
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: fridgeKeys.shopping }),
  });
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("shopping_items").update({ done }).eq("id", id);
      fail(error);
    },
    onMutate: ({ id, done }) =>
      qc.setQueriesData<ShoppingItem[]>({ queryKey: fridgeKeys.shopping }, (old) =>
        old?.map((i) => (i.id === id ? { ...i, done } : i)),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: fridgeKeys.shopping }),
  });
}

/** Apaga itens (um, os comprados ou todos). */
export function useDeleteShoppingItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase.from("shopping_items").delete().in("id", ids);
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fridgeKeys.shopping }),
  });
}
