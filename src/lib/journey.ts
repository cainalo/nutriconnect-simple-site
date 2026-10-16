// Parceiro de jornada (N6): dupla de apoio entre dois amigos. Check-in diário de um toque com
// recado curto, "mandar força" uma vez por dia e a sequência gentil da dupla. O parceiro só vê o
// check-in do dia; as regras (amizade, uma dupla por pessoa, quem vê o quê) moram no banco.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Names } from "@/lib/appearance-data";
import { checkinDay, daysAgo } from "@/lib/checkins";
import { cardsByIds, type PersonCard } from "@/lib/social/api";

export type JourneyPair = Tables<"journey_pairs">;
export type JourneyCheckin = Tables<"journey_checkins">;
export type JourneyMood = "cuidei" | "mais_ou_menos" | "dificil";

export const NOTE_MAX = 140;

export const MOODS: { id: JourneyMood; emoji: string; name: Names }[] = [
  {
    id: "cuidei",
    emoji: "🌱",
    name: ["Cuidei de mim", "Took care of myself", "Me cuidé", "J'ai pris soin de moi"],
  },
  {
    id: "mais_ou_menos",
    emoji: "🙂",
    name: ["Mais ou menos", "So-so", "Más o menos", "Comme ci, comme ça"],
  },
  {
    id: "dificil",
    emoji: "🌧️",
    name: ["Dia difícil", "Hard day", "Día difícil", "Journée difficile"],
  },
];

export const moodOf = (id: string | null | undefined) => MOODS.find((m) => m.id === id);

export interface PartnerStatus {
  pairId: string;
  partnerId: string;
  since: string | null;
  partnerToday: { mood: JourneyMood; note: string | null; at: string } | null;
  togetherDays: string[];
  cheerSent: boolean;
  cheerReceived: boolean;
}

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** Dias carregados dos próprios check-ins (sequência e sinal de dias difíceis). */
const WINDOW_DAYS = 35;

export const journeyKeys = {
  all: ["journey"] as const,
  pairs: (userId: string) => ["journey", "pairs", userId] as const,
  status: (userId: string, day: string) => ["journey", "status", userId, day] as const,
  mine: (userId: string) => ["journey", "mine", userId] as const,
  people: (ids: string[]) => ["journey", "people", ...ids] as const,
};

/** Dupla ativa e convites (enviado e recebidos) da pessoa logada. */
export function useJourneyPairs(userId: string | undefined) {
  return useQuery({
    queryKey: journeyKeys.pairs(userId ?? ""),
    enabled: !!userId,
    queryFn: async (): Promise<JourneyPair[]> => {
      const { data, error } = await supabase
        .from("journey_pairs")
        .select("*")
        .order("created_at", { ascending: false });
      fail(error);
      return data ?? [];
    },
  });
}

/** O que dá para ver do parceiro hoje (null = sem dupla ativa). */
export function usePartnerStatus(userId: string | undefined) {
  const day = checkinDay();
  return useQuery({
    queryKey: journeyKeys.status(userId ?? "", day),
    enabled: !!userId,
    // O check-in do parceiro aparece sem precisar recarregar a página.
    refetchInterval: 60_000,
    queryFn: async (): Promise<PartnerStatus | null> => {
      const { data, error } = await supabase.rpc("journey_partner_status", { p_day: day });
      fail(error);
      if (!data || typeof data !== "object" || Array.isArray(data)) return null;
      const s = data as Record<string, unknown>;
      return {
        pairId: String(s.pair_id),
        partnerId: String(s.partner_id),
        since: (s.since as string | null) ?? null,
        partnerToday: (s.partner_today as PartnerStatus["partnerToday"]) ?? null,
        togetherDays: (s.together_days as string[] | null) ?? [],
        cheerSent: !!s.cheer_sent,
        cheerReceived: !!s.cheer_received,
      };
    },
  });
}

/** Os próprios check-ins das últimas semanas. */
export function useMyJourneyCheckins(userId: string | undefined) {
  return useQuery({
    queryKey: journeyKeys.mine(userId ?? ""),
    enabled: !!userId,
    queryFn: async (): Promise<JourneyCheckin[]> => {
      const { data, error } = await supabase
        .from("journey_checkins")
        .select("*")
        .eq("user_id", userId!)
        .gte("day", daysAgo(WINDOW_DAYS - 1))
        .order("day", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

/** Nome e foto das pessoas da dupla e dos convites. */
export function useJourneyPeople(ids: string[]) {
  const sorted = [...new Set(ids)].sort();
  return useQuery({
    queryKey: journeyKeys.people(sorted),
    enabled: sorted.length > 0,
    queryFn: async (): Promise<Map<string, PersonCard>> => cardsByIds(sorted),
  });
}

function useJourneyMutation<T>(fn: (arg: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: journeyKeys.all }),
  });
}

export function useJourneyInvite() {
  return useJourneyMutation(async (userId: string) => {
    const { error } = await supabase.rpc("journey_invite", { p_user: userId });
    fail(error);
  });
}

export function useJourneyRespond() {
  return useJourneyMutation(async ({ pairId, accept }: { pairId: string; accept: boolean }) => {
    const { error } = await supabase.rpc("journey_respond", { p_pair: pairId, p_accept: accept });
    fail(error);
  });
}

/** Sai da dupla ativa ou, com `pairId`, cancela um convite enviado. */
export function useJourneyLeave() {
  return useJourneyMutation(async (pairId?: string) => {
    const { error } = await supabase.rpc("journey_leave", { p_pair: pairId });
    fail(error);
  });
}

export function useJourneyCheckin() {
  return useJourneyMutation(async ({ mood, note }: { mood: JourneyMood; note: string }) => {
    const { error } = await supabase.rpc("journey_checkin", {
      p_day: checkinDay(),
      p_mood: mood,
      p_note: note.trim().slice(0, NOTE_MAX),
    });
    fail(error);
  });
}

export function useJourneyCheer() {
  return useJourneyMutation(async () => {
    const { error } = await supabase.rpc("journey_cheer", { p_day: checkinDay() });
    fail(error);
  });
}

/** Os últimos `n` dias, do mais antigo para hoje. */
export function lastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgo(n - 1 - i));
}

/**
 * Sequência gentil da dupla (mesma regra das metas): conta os dias em que os dois fizeram
 * check-in. Um dia sem os dois no meio não quebra; só dois seguidos. Hoje ainda não conta contra.
 */
export function pairStreak(togetherDays: string[], days = lastDays(WINDOW_DAYS)) {
  const set = new Set(togetherDays);
  let together = 0;
  let gap = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (set.has(days[i])) {
      together++;
      gap = 0;
    } else if (i !== days.length - 1) {
      gap++;
      if (gap >= 2) break;
    }
  }
  const last7 = days.slice(-7).map((d) => set.has(d));
  return { together, last7 };
}

/**
 * Três dias difíceis seguidos (terminando hoje ou ontem): mostra, só para a própria pessoa, um
 * convite gentil para conversar com um profissional.
 */
export function needsSupport(mine: JourneyCheckin[]): boolean {
  const byDay = new Map(mine.map((c) => [c.day, c.mood]));
  const start = byDay.has(checkinDay()) ? 0 : 1;
  for (let i = start; i < start + 3; i++) {
    if (byDay.get(daysAgo(i)) !== "dificil") return false;
  }
  return true;
}
