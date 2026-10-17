// Hábitos do dia (Funções): catálogo fixo de 12 hábitos; cada pessoa escolhe de 3 a 8, e a escolha
// fica na conta (user_settings.habit_choice). Sem escolha, valem os 4 de sempre. Os ids são os
// mesmos que o banco aceita em daily_checkins.habits (migration 20261017100000_habit_catalog).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Apple,
  Bean,
  Carrot,
  Coffee,
  CookingPot,
  CupSoda,
  Footprints,
  GlassWater,
  ListChecks,
  Moon,
  Sun,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Names } from "@/lib/appearance-data";
import { getMySettings, updateMySettings } from "@/lib/social/api";
import { qk } from "@/lib/social/queries";

export interface HabitDef {
  id: string;
  icon: LucideIcon;
  name: Names;
  /** Cor no relatório em PDF (RGB). */
  rgb: readonly [number, number, number];
}

export const HABIT_CATALOG: HabitDef[] = [
  {
    id: "water",
    icon: GlassWater,
    name: ["Bebi água", "Drank water", "Bebí agua", "J'ai bu de l'eau"],
    rgb: [59, 123, 191],
  },
  {
    id: "veg",
    icon: Carrot,
    name: ["Comi legumes ou verduras", "Ate vegetables", "Comí verduras", "J'ai mangé des légumes"],
    rgb: [79, 138, 75],
  },
  {
    id: "move",
    icon: Footprints,
    name: ["Me movimentei", "I got moving", "Me moví", "J'ai bougé"],
    rgb: [217, 105, 42],
  },
  {
    id: "sleep",
    icon: Moon,
    name: ["Dormi bem", "Slept well", "Dormí bien", "J'ai bien dormi"],
    rgb: [138, 95, 176],
  },
  {
    id: "fruit",
    icon: Apple,
    name: ["Comi fruta", "Ate fruit", "Comí fruta", "J'ai mangé un fruit"],
    rgb: [200, 60, 70],
  },
  {
    id: "beans",
    icon: Bean,
    name: [
      "Comi feijão, lentilha ou grão-de-bico",
      "Ate beans, lentils or chickpeas",
      "Comí frijoles, lentejas o garbanzos",
      "J'ai mangé des haricots, lentilles ou pois chiches",
    ],
    rgb: [140, 90, 50],
  },
  {
    id: "breakfast",
    icon: Coffee,
    name: ["Tomei café da manhã", "Had breakfast", "Desayuné", "J'ai pris un petit-déjeuner"],
    rgb: [170, 120, 60],
  },
  {
    id: "homemade",
    icon: CookingPot,
    name: [
      "Comi comida feita em casa",
      "Ate home-cooked food",
      "Comí comida casera",
      "J'ai mangé fait maison",
    ],
    rgb: [180, 83, 42],
  },
  {
    id: "slow",
    icon: Timer,
    name: [
      "Comi sem pressa e sem tela",
      "Ate slowly, no screens",
      "Comí sin prisa y sin pantallas",
      "J'ai mangé lentement, sans écran",
    ],
    rgb: [85, 95, 54],
  },
  {
    id: "no_soda",
    icon: CupSoda,
    name: [
      "Fiquei sem refrigerante",
      "Skipped soda",
      "Pasé el día sin refresco",
      "Pas de soda aujourd'hui",
    ],
    rgb: [40, 120, 130],
  },
  {
    id: "outdoor",
    icon: Sun,
    name: [
      "Passei um tempo ao ar livre",
      "Spent time outdoors",
      "Pasé un rato al aire libre",
      "J'ai passé du temps dehors",
    ],
    rgb: [210, 160, 30],
  },
  {
    id: "planned",
    icon: ListChecks,
    name: [
      "Planejei as refeições",
      "Planned my meals",
      "Planifiqué las comidas",
      "J'ai prévu mes repas",
    ],
    rgb: [90, 100, 160],
  },
];

export const DEFAULT_HABITS = ["water", "veg", "move", "sleep"];
export const MIN_HABITS = 3;
export const MAX_HABITS = 8;

const byId = new Map(HABIT_CATALOG.map((h) => [h.id, h]));
export const habitDef = (id: string) => byId.get(id);

/** Hábitos escolhidos pela pessoa (na ordem do catálogo) e como trocar a escolha. */
export function useHabitChoice() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: qk.settings(), queryFn: getMySettings, enabled: !!user });
  const saved = settings.data?.habit_choice;
  const ids = saved && saved.length >= MIN_HABITS ? saved : DEFAULT_HABITS;
  const chosen = HABIT_CATALOG.filter((h) => ids.includes(h.id));
  const save = useMutation({
    mutationFn: (next: string[]) => updateMySettings({ habit_choice: next }),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.settings() }),
  });
  return { chosen, ids: chosen.map((h) => h.id), save };
}
