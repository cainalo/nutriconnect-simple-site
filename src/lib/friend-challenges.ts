// X3 — Desafios entre amigos e liga da semana. Regras e contas no banco:
// supabase/migrations/20261017150000_friend_challenges.sql. Tudo conta DIAS na semana (domingo a
// sábado); ninguém vê dados de saúde dos amigos, só quantos dias cada um cumpriu.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Names } from "@/lib/appearance-data";

export type ChallengeMetric = "agua" | "verduras" | "caseira" | "mover" | "calma" | "trilha";

/** 6 métricas (grade 3×2). `how` diz de onde vem o dia que conta. */
export const METRICS: { id: ChallengeMetric; emoji: string; names: Names; how: Names }[] = [
  {
    id: "agua",
    emoji: "💧",
    names: ["Água na meta", "Water goal", "Agua en la meta", "Objectif d'eau"],
    how: [
      "Dias em que bateu a meta em Água de hoje",
      "Days you hit your goal in Today's water",
      "Días en que llegaste a la meta en Agua de hoy",
      "Jours où l'objectif d'eau est atteint",
    ],
  },
  {
    id: "verduras",
    emoji: "🥦",
    names: ["Verduras", "Vegetables", "Verduras", "Légumes"],
    how: [
      "Dias com o hábito Verduras marcado",
      "Days with the Vegetables habit checked",
      "Días con el hábito Verduras marcado",
      "Jours avec l'habitude Légumes cochée",
    ],
  },
  {
    id: "caseira",
    emoji: "🍲",
    names: ["Comida de casa", "Home cooking", "Comida casera", "Fait maison"],
    how: [
      "Dias com o hábito Comida feita em casa",
      "Days with the Home-cooked meal habit",
      "Días con el hábito Comida hecha en casa",
      "Jours avec l'habitude Repas fait maison",
    ],
  },
  {
    id: "mover",
    emoji: "🚶",
    names: ["Movimento", "Movement", "Movimiento", "Bouger"],
    how: [
      "Dias com o hábito Movimento marcado",
      "Days with the Movement habit checked",
      "Días con el hábito Movimiento marcado",
      "Jours avec l'habitude Bouger cochée",
    ],
  },
  {
    id: "calma",
    emoji: "🧘",
    names: ["Refeição com calma", "Mindful meal", "Comida con calma", "Repas en pleine conscience"],
    how: [
      "Dias com pelo menos uma Refeição com calma",
      "Days with at least one Mindful meal",
      "Días con al menos una Comida con calma",
      "Jours avec au moins un repas en pleine conscience",
    ],
  },
  {
    id: "trilha",
    emoji: "📚",
    names: ["Trilha", "Learning path", "Ruta", "Parcours"],
    how: [
      "Dias em que fez alguma lição da trilha",
      "Days you did a lesson on the path",
      "Días en que hiciste alguna lección",
      "Jours avec au moins une leçon",
    ],
  },
];
export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m])) as Record<
  ChallengeMetric,
  (typeof METRICS)[number]
>;

export interface ChallengeMember {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: "convidado" | "aceito" | "recusado";
  days: number;
  is_me: boolean;
}

export interface FriendChallenge {
  id: string;
  metric: ChallengeMetric;
  target: number;
  title: string | null;
  week_start: string;
  creator_id: string;
  my_status: "convidado" | "aceito" | "recusado";
  members: ChallengeMember[];
}

export interface LeagueRow {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  points: number;
  agua: number;
  verduras: number;
  caseira: number;
  mover: number;
  calma: number;
  trilha: number;
  is_me: boolean;
}

const KEY = ["friend-challenges"] as const;

/** Domingo da semana atual (AAAA-MM-DD, no fuso do aparelho; o banco usa Brasília). */
export function weekStartOf(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
}

export function useMyFriendChallenges(enabled = true) {
  return useQuery({
    queryKey: [...KEY, "mine"],
    enabled,
    queryFn: async (): Promise<FriendChallenge[]> => {
      const { data, error } = await supabase.rpc("my_friend_challenges");
      // Sem a migration aplicada, a aba fica vazia.
      if (error || !data) return [];
      return data.map((c) => ({
        ...c,
        metric: c.metric as ChallengeMetric,
        my_status: c.my_status as FriendChallenge["my_status"],
        members: (c.members as unknown as ChallengeMember[] | null) ?? [],
      }));
    },
  });
}

export function useLeague(enabled = true, weekStart?: string) {
  return useQuery({
    queryKey: [...KEY, "league", weekStart ?? "atual"],
    enabled,
    queryFn: async (): Promise<LeagueRow[]> => {
      const { data, error } = await supabase.rpc(
        "friends_weekly_league",
        weekStart ? { p_week_start: weekStart } : {},
      );
      if (error) return [];
      return data ?? [];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(error.message);
  return data;
}

export function useCreateFriendChallenge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: {
      metric: ChallengeMetric;
      target: number;
      friends: string[];
      title: string;
    }) =>
      check(
        await supabase.rpc("create_friend_challenge", {
          p_metric: v.metric,
          p_target: v.target,
          p_friends: v.friends,
          p_title: v.title.trim() || undefined,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRespondFriendChallenge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { id: string; accept: boolean }) =>
      check(
        await supabase.rpc("respond_friend_challenge", {
          p_challenge: v.id,
          p_accept: v.accept,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useCheer() {
  return useMutation({
    mutationFn: async (v: { challengeId: string; userId: string }) =>
      check(
        await supabase.rpc("cheer_friend_challenge", {
          p_challenge: v.challengeId,
          p_user: v.userId,
        }),
      ),
  });
}

export function useSetLeagueVisible() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (visible: boolean) =>
      check(await supabase.rpc("set_league_visible", { p_visible: visible })),
    onSuccess: invalidate,
  });
}

/** Se a pessoa aparece na liga dos amigos (padrão: sim). */
export function useLeagueVisible(userId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "visible", userId ?? ""],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("league_visible")
        .eq("id", userId!)
        .maybeSingle();
      if (error) return true;
      return data?.league_visible ?? true;
    },
  });
}
