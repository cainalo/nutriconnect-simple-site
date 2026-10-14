// Grupo familiar "Minha casa" (F1): a casa da pessoa, quem mora nela, convites por código/link ou
// para amigos, e o tempo real da lista de compras da casa. As regras (uma casa por pessoa, até 8,
// quem pode o quê) moram no banco.
import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cardsByIds, type PersonCard } from "@/lib/social/api";

export type Household = Tables<"households">;
export type HouseholdMember = Tables<"household_members">;
export type HouseholdRole = "responsavel" | "membro";

export const MAX_MEMBERS = 8;
export const HOUSE_EMOJIS = ["🏠", "🏡", "🏢", "🌻", "🍲", "🥑", "🐱", "🐶", "💛", "🌿"];

export interface MyHousehold {
  house: Household;
  role: HouseholdRole;
  members: HouseholdMember[];
}

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const householdKeys = {
  all: ["household"] as const,
  mine: (userId: string) => ["household", "mine", userId] as const,
  people: (ids: string[]) => ["household", "people", ...ids] as const,
  preview: (code: string) => ["household", "preview", code] as const,
  code: (houseId: string) => ["household", "code", houseId] as const,
};

/** Link de entrada que vai junto com o código. */
export const joinLink = (code: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/casa/entrar/${code}`;

async function getMine(userId: string): Promise<MyHousehold | null> {
  const { data: me, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  fail(error);
  if (!me) return null;
  const [house, members] = await Promise.all([
    supabase.from("households").select("*").eq("id", me.household_id).single(),
    supabase
      .from("household_members")
      .select("*")
      .eq("household_id", me.household_id)
      .order("joined_at", { ascending: true }),
  ]);
  fail(house.error);
  fail(members.error);
  return { house: house.data!, role: me.role as HouseholdRole, members: members.data ?? [] };
}

/** A casa da pessoa logada (null = não está em nenhuma). */
export function useMyHousehold(userId: string | undefined) {
  return useQuery({
    queryKey: householdKeys.mine(userId ?? ""),
    enabled: !!userId,
    staleTime: 60_000,
    // Sem casa (ou banco sem a tabela ainda) não deve segurar a lista de compras.
    retry: false,
    queryFn: () => getMine(userId!),
  });
}

/** Nome e foto de quem mora na casa. */
export function useHouseholdPeople(ids: string[]) {
  const sorted = [...new Set(ids)].sort();
  return useQuery({
    queryKey: householdKeys.people(sorted),
    enabled: sorted.length > 0,
    queryFn: async (): Promise<Map<string, PersonCard>> => cardsByIds(sorted),
  });
}

/** Código de convite atual (gera um se não houver ou se venceu). */
export function useInviteCode(houseId: string | undefined) {
  return useQuery({
    queryKey: householdKeys.code(houseId ?? ""),
    enabled: !!houseId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("household_invite_code", { p_new: false });
      fail(error);
      return data as { code: string; expires_at: string };
    },
  });
}

/** Nome e tamanho da casa de um código, para a tela de entrada (null = inválido ou vencido). */
export function useHouseholdPreview(code: string) {
  return useQuery({
    queryKey: householdKeys.preview(code),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("household_preview", { p_code: code });
      fail(error);
      return (data as { name: string; emoji: string; members: number } | null) ?? null;
    },
  });
}

function useHouseholdMutation<T, R = unknown>(fn: (arg: T) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: householdKeys.all });
      for (const key of ["shopping", "fridge-items", "weekly-menu"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useCreateHousehold() {
  return useHouseholdMutation(async ({ name, emoji }: { name: string; emoji: string }) => {
    const { error } = await supabase.rpc("household_create", { p_name: name, p_emoji: emoji });
    fail(error);
  });
}

export function useUpdateHousehold() {
  return useHouseholdMutation(async ({ name, emoji }: { name: string; emoji: string }) => {
    const { error } = await supabase.rpc("household_update", { p_name: name, p_emoji: emoji });
    fail(error);
  });
}

export function useNewInviteCode() {
  return useHouseholdMutation(async () => {
    const { error } = await supabase.rpc("household_invite_code", { p_new: true });
    fail(error);
  });
}

export function useJoinHousehold() {
  return useHouseholdMutation(async (code: string) => {
    const { error } = await supabase.rpc("household_join", { p_code: code });
    fail(error);
  });
}

export function useInviteFriendToHouse() {
  return useHouseholdMutation(async (userId: string) => {
    const { error } = await supabase.rpc("household_invite_friend", { p_user: userId });
    fail(error);
  });
}

/** Leva os itens da lista pessoal para a lista da casa. Devolve quantos foram. */
export function useBringMyItems() {
  return useHouseholdMutation(async (): Promise<number> => {
    const { data, error } = await supabase.rpc("household_bring_my_items");
    fail(error);
    return data ?? 0;
  });
}

export function useLeaveHousehold() {
  return useHouseholdMutation(async () => {
    const { error } = await supabase.rpc("household_leave");
    fail(error);
  });
}

export function useRemoveHouseMember() {
  return useHouseholdMutation(async (userId: string) => {
    const { error } = await supabase.rpc("household_remove_member", { p_user: userId });
    fail(error);
  });
}

export function useTransferHousehold() {
  return useHouseholdMutation(async (userId: string) => {
    const { error } = await supabase.rpc("household_transfer", { p_user: userId });
    fail(error);
  });
}

/** Quantos itens a pessoa tem na lista de compras (não comprados) e na geladeira pessoais. */
export async function countMyPersonalItems(userId: string): Promise<number> {
  const [shopping, fridge] = await Promise.all([
    supabase
      .from("shopping_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("household_id", null)
      .eq("done", false),
    supabase
      .from("fridge_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("household_id", null),
  ]);
  fail(shopping.error);
  return (shopping.count ?? 0) + (fridge.count ?? 0);
}

/**
 * Tempo real da casa: a lista de compras e os membros se atualizam na tela quando alguém da casa
 * mexe. Fica ligado uma vez nas telas internas (AppScreen).
 */
export function useHouseholdRealtime(houseId: string | undefined) {
  const qc = useQueryClient();
  const id = useId();
  useEffect(() => {
    if (!houseId) return;
    const house = `household_id=eq.${houseId}`;
    // O que cada tabela da casa faz recarregar.
    const tables: [string, readonly string[]][] = [
      ["shopping_items", ["shopping"]],
      ["fridge_items", ["fridge-items"]],
      ["weekly_menus", ["weekly-menu"]],
      ["household_members", householdKeys.all],
      ["household_notes", ["household-notes"]],
    ];
    let channel = supabase.channel(`casa-${houseId}-${id}`);
    for (const [table, queryKey] of tables) {
      const reload = () => void qc.invalidateQueries({ queryKey });
      channel = channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table, filter: house }, reload)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter: house }, reload)
        // Exclusões não aceitam filtro no Realtime: qualquer uma só faz recarregar.
        .on("postgres_changes", { event: "DELETE", schema: "public", table }, reload);
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [houseId, id, qc]);
}

// ---------------------------------------------------------------------------
// Mural da casa e crianças da casa (F3)
// ---------------------------------------------------------------------------

export type HouseNote = Tables<"household_notes">;
export const NOTE_MAX = 200;

/** Recados do mural, do mais novo para o mais antigo. */
export function useHouseNotes(houseId: string | undefined) {
  return useQuery({
    queryKey: ["household-notes", houseId ?? ""],
    enabled: !!houseId,
    retry: false,
    queryFn: async (): Promise<HouseNote[]> => {
      const { data, error } = await supabase
        .from("household_notes")
        .select("*")
        .eq("household_id", houseId!)
        .order("created_at", { ascending: false })
        .limit(50);
      fail(error);
      return data ?? [];
    },
  });
}

export function useAddHouseNote(houseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("household_notes")
        .insert({ household_id: houseId!, body: body.trim().slice(0, NOTE_MAX) });
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["household-notes"] }),
  });
}

export function useDeleteHouseNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("household_notes").delete().eq("id", id);
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["household-notes"] }),
  });
}

/** Crianças dos outros moradores (a Lancheira mostra junto com as próprias). */
export function useHouseholdKids(houseId: string | undefined) {
  return useQuery({
    queryKey: ["household", "kids", houseId ?? ""],
    enabled: !!houseId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("household_kids");
      fail(error);
      return data ?? [];
    },
  });
}
