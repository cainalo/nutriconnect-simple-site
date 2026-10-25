// X4 — Pontos e recompensas. Regras no banco: supabase/migrations/20261018100000_reward_points.sql.
// Pontos entram toda segunda (10 por dia da liga + 50 por desafio com amigos cumprido). O desconto
// de programa sai da taxa da plataforma (Edge Function program-checkout).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Reward = Tables<"rewards">;
export type Redemption = Tables<"reward_redemptions"> & {
  rewards: Pick<Reward, "title" | "kind" | "discount_percent" | "description"> | null;
};
export type PointsRow = Tables<"reward_points">;

const KEY = ["rewards"] as const;

export function useRewardBalance(enabled = true) {
  return useQuery({
    queryKey: [...KEY, "balance"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reward_balance");
      return error ? 0 : (data ?? 0);
    },
  });
}

/** O que a pessoa já juntou nesta semana (entra no saldo na segunda-feira). */
export function useWeekPreview(enabled = true) {
  return useQuery({
    queryKey: [...KEY, "preview"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reward_week_preview");
      return error ? 0 : (data ?? 0);
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: [...KEY, "catalog"],
    queryFn: async (): Promise<Reward[]> => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .order("position")
        .order("cost");
      return error ? [] : (data ?? []);
    },
  });
}

export function useMyRedemptions(userId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "mine", userId ?? ""],
    enabled: !!userId,
    queryFn: async (): Promise<Redemption[]> => {
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("*, rewards(title, kind, discount_percent, description)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return error ? [] : ((data ?? []) as Redemption[]);
    },
  });
}

export function usePointsHistory(userId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "history", userId ?? ""],
    enabled: !!userId,
    queryFn: async (): Promise<PointsRow[]> => {
      const { data, error } = await supabase
        .from("reward_points")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return error ? [] : (data ?? []);
    },
  });
}

/** Códigos de desconto de programa ainda válidos (para usar na compra). */
export function activeDiscounts(list: Redemption[], now = Date.now()) {
  return list.filter(
    (r) =>
      r.status === "ativo" &&
      r.rewards?.kind === "desconto_programa" &&
      new Date(r.expires_at).getTime() > now,
  );
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useRedeem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { data, error } = await supabase.rpc("redeem_reward", { p_reward: rewardId });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}

// ───────────────────────── Administração ─────────────────────────

export function useAllRedemptions(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "admin-redemptions"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("*, rewards(title, kind, discount_percent, description)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as Redemption[];
    },
  });
}

export function useSaveReward() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: TablesInsert<"rewards"> & { id?: string }) => {
      const { id, ...row } = v;
      const { error } = id
        ? await supabase.from("rewards").update(row).eq("id", id)
        : await supabase.from("rewards").insert(row);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useAdminRedemption() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { id: string; action: "entregue" | "devolver" }) => {
      const { error } = await supabase.rpc("admin_set_redemption", {
        p_redemption: v.id,
        p_action: v.action,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
