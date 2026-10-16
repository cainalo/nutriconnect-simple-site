// Registros do dia na conta (página Funções e cards das laterais): hábitos, humor com a comida,
// compromisso do tema da semana, refeições com calma e quiz. Só a própria pessoa lê e escreve;
// valem em todos os aparelhos (antes ficavam só no navegador).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Checkin = Tables<"daily_checkins">;
export type CheckinPatch = Partial<
  Pick<Checkin, "habits" | "mood" | "pledge" | "mindful_meals" | "quiz_best">
>;

/** Dias carregados de uma vez: cobre as sequências, a semana e o gráfico do mês. */
const WINDOW_DAYS = 35;

const pad = (n: number) => String(n).padStart(2, "0");
/** Data local no formato AAAA-MM-DD. */
export const checkinDay = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** O dia de `n` dias atrás (0 = hoje). */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return checkinDay(d);
}

/** Segunda-feira da semana de `d`. */
export function weekStartDay(d = new Date()): string {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return checkinDay(x);
}

export const checkinKeys = {
  all: ["checkins"] as const,
  list: (userId: string) => ["checkins", userId] as const,
};

export function useCheckins(userId: string | undefined) {
  return useQuery({
    queryKey: checkinKeys.list(userId ?? ""),
    enabled: !!userId,
    queryFn: async (): Promise<Checkin[]> => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId as string)
        .gte("day", daysAgo(WINDOW_DAYS - 1))
        .order("day", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

/** Registros por dia (AAAA-MM-DD). */
export function checkinsByDay(rows: Checkin[] | undefined): Map<string, Checkin> {
  return new Map((rows ?? []).map((r) => [r.day, r]));
}

function blank(userId: string, day: string): Checkin {
  return {
    user_id: userId,
    day,
    habits: [],
    mood: null,
    pledge: false,
    mindful_meals: 0,
    quiz_best: null,
    updated_at: new Date().toISOString(),
  };
}

/** Grava só os campos informados do dia (cria o registro se ainda não existir). */
export function useSaveCheckin(userId: string | undefined) {
  const qc = useQueryClient();
  const key = checkinKeys.list(userId ?? "");
  return useMutation({
    mutationFn: async ({ day, patch }: { day: string; patch: CheckinPatch }) => {
      if (!userId) throw new Error("É preciso estar logado.");
      const { error } = await supabase
        .from("daily_checkins")
        .upsert({ user_id: userId, day, ...patch }, { onConflict: "user_id,day" });
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ day, patch }) => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Checkin[]>(key);
      qc.setQueryData<Checkin[]>(key, (old = []) => {
        const found = old.some((r) => r.day === day);
        const next = found
          ? old.map((r) => (r.day === day ? { ...r, ...patch } : r))
          : [...old, { ...blank(userId, day), ...patch }];
        return next.sort((a, b) => a.day.localeCompare(b.day));
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Dias seguidos em que `hit` vale (hoje conta se já valer; senão a contagem começa ontem). */
export function streakOf(map: Map<string, Checkin>, hit: (c: Checkin | undefined) => boolean) {
  let streak = 0;
  let i = hit(map.get(daysAgo(0))) ? 0 : 1;
  while (hit(map.get(daysAgo(i)))) {
    streak += 1;
    i += 1;
  }
  return streak;
}
