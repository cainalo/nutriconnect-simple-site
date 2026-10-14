// Cardápio da semana (N3): um cardápio por semana (segunda a domingo) na conta da pessoa, ou um
// só para a casa de quem mora num grupo familiar (F2).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { Names } from "@/lib/appearance-data";
import { useMyHousehold } from "@/lib/household";
import type { Budget, MealKey, MenuMeal, Section } from "@/lib/menu.functions";

export type WeeklyMenu = Tables<"weekly_menus">;
export type MenuMeals = Partial<Record<string, MenuMeal>>;

export const slotKey = (day: number, meal: MealKey) => `${day}-${meal}`;

const pad = (n: number) => String(n).padStart(2, "0");
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Segunda-feira da semana de `date` (data local, AAAA-MM-DD). */
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoLocal(d);
}

/** Soma semanas a uma segunda-feira. */
export function addWeeks(monday: string, weeks: number) {
  const [y, m, d] = monday.split("-").map(Number);
  return isoLocal(new Date(y, m - 1, d + weeks * 7));
}

/** Data de cada dia da semana (0 = segunda). */
export function dayDate(monday: string, day: number) {
  const [y, m, d] = monday.split("-").map(Number);
  return new Date(y, m - 1, d + day);
}

export const DAY_NAMES: Names[] = [
  ["Segunda", "Monday", "Lunes", "Lundi"],
  ["Terça", "Tuesday", "Martes", "Mardi"],
  ["Quarta", "Wednesday", "Miércoles", "Mercredi"],
  ["Quinta", "Thursday", "Jueves", "Jeudi"],
  ["Sexta", "Friday", "Viernes", "Vendredi"],
  ["Sábado", "Saturday", "Sábado", "Samedi"],
  ["Domingo", "Sunday", "Domingo", "Dimanche"],
];

export const MEAL_NAMES: Record<MealKey, Names> = {
  almoco: ["Almoço", "Lunch", "Almuerzo", "Déjeuner"],
  jantar: ["Jantar", "Dinner", "Cena", "Dîner"],
};

export const BUDGET_NAMES: Record<Budget, Names> = {
  economico: ["Econômico", "Budget", "Económico", "Économique"],
  moderado: ["Moderado", "Moderate", "Moderado", "Modéré"],
  livre: ["Sem limite", "No limit", "Sin límite", "Sans limite"],
};

export const SECTION_NAMES: Record<Section, Names> = {
  hortifruti: ["Hortifrúti", "Produce", "Frutas y verduras", "Fruits et légumes"],
  acougue: ["Açougue e ovos", "Meat and eggs", "Carnes y huevos", "Viandes et œufs"],
  laticinios: ["Laticínios", "Dairy", "Lácteos", "Produits laitiers"],
  padaria: ["Padaria", "Bakery", "Panadería", "Boulangerie"],
  mercearia: ["Mercearia", "Pantry", "Despensa", "Épicerie"],
  outros: ["Outros", "Other", "Otros", "Autres"],
};

export const menuKey = (week: string) => ["weekly-menu", week] as const;

/**
 * O cardápio da semana: o da casa, se a pessoa mora numa (os pessoais ficam guardados), ou o
 * pessoal. Fora de uma casa o RLS já mostra só os pessoais.
 */
export function useWeeklyMenu(userId: string | undefined, week: string) {
  const house = useMyHousehold(userId);
  const houseId = house.data?.house.id ?? null;
  return useQuery({
    queryKey: menuKey(week),
    enabled: !!userId && !house.isLoading,
    queryFn: async (): Promise<WeeklyMenu | null> => {
      let query = supabase.from("weekly_menus").select("*").eq("week_start", week);
      if (houseId) query = query.eq("household_id", houseId);
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

/** Grava o cardápio da semana inteiro (o da casa ou o pessoal; cria na primeira vez). */
export function useSaveMenu(userId: string | undefined, week: string) {
  const qc = useQueryClient();
  const house = useMyHousehold(userId);
  const houseId = house.data?.house.id ?? null;
  return useMutation({
    mutationFn: async ({ budget, meals }: { budget: Budget; meals: MenuMeals }) => {
      const { error } = await supabase.rpc("weekly_menu_save", {
        p_week: week,
        p_budget: budget,
        p_meals: meals as unknown as Json,
      });
      if (!error) return;
      // Banco ainda sem a função da casa (migration pendente): grava como antes.
      if (error.code !== "PGRST202") throw new Error(error.message);
      const old = await supabase
        .from("weekly_menus")
        .upsert(
          { user_id: userId!, week_start: week, budget, meals: meals as unknown as Json },
          { onConflict: "user_id,week_start" },
        );
      if (old.error) throw new Error(old.error.message);
    },
    onMutate: ({ budget, meals }) => {
      const old = qc.getQueryData<WeeklyMenu | null>(menuKey(week));
      const next: WeeklyMenu = {
        id: old?.id ?? "novo",
        user_id: old?.user_id ?? userId!,
        household_id: old?.household_id ?? houseId,
        week_start: week,
        created_at: old?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: userId ?? null,
        budget,
        meals: meals as unknown as Json,
      };
      qc.setQueryData(menuKey(week), next);
      return { old };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(menuKey(week), ctx?.old ?? null),
    onSettled: () => qc.invalidateQueries({ queryKey: menuKey(week) }),
  });
}
