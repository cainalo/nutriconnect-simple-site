// Cardápio sem a Nina (T1o): preenche refeições vazias com receitas guardadas e pratos de sempre
// (lib/basic-recipes.ts), sem IA. Função pura, sem acesso ao banco.
import type { Names } from "@/lib/appearance-data";
import { BASIC_RECIPES, type BasicRecipe } from "@/lib/basic-recipes";
import type { MealKey, MenuMeal } from "@/lib/menu.functions";
import type { MenuMeals } from "@/lib/menu";

// Mesma chave de lib/menu.ts (aqui sem importar o banco).
const slotKey = (day: number, meal: MealKey) => `${day}-${meal}`;
const MEALS: MealKey[] = ["almoco", "jantar"];

/** Pratos de sempre que fazem um almoço ou jantar (os de café e lanche ficam de fora). */
const MAIN_BASICS = [
  "arroz-feijao",
  "frango-molho",
  "escondidinho",
  "macarrao-brocolis",
  "sopa",
  "omelete",
  "salada-grao",
  "cuscuz",
];

const plain = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Receita de sempre no formato do cardápio, no idioma da pessoa. */
export function fromBasic(r: BasicRecipe, tr: (n: Names) => string): MenuMeal {
  return {
    title: tr(r.title),
    prepTime: `${r.minutes} min`,
    servings: "",
    ingredients: r.ingredients.map(([, n]) => tr(n)),
    steps: r.steps.map((st) => tr(st)),
    tip: "",
    source: "manual",
  };
}

/**
 * Preenche as refeições vazias sem a Nina: receitas guardadas e pratos de sempre, primeiro os que
 * mais aproveitam o que está na geladeira, sem repetir prato na semana enquanto houver opção; se
 * faltar, repete o menos usado, nunca no mesmo dia.
 */
export function fillWithoutNina(
  meals: MenuMeals,
  slots: { day: number; meal: MealKey }[],
  saved: MenuMeal[],
  have: string[],
  tr: (n: Names) => string,
): MenuMeals {
  const fridge = have.map(plain).filter((h) => h.length >= 3);
  const hits = (keys: string[]) =>
    keys.filter((k) => fridge.some((h) => h.includes(k) || k.includes(h))).length;
  const options: { meal: MenuMeal; score: number }[] = [
    ...saved.map((m) => ({ meal: m, score: hits(m.ingredients.map(plain)) + 0.5 })),
    ...BASIC_RECIPES.filter((r) => MAIN_BASICS.includes(r.id)).map((r) => ({
      meal: fromBasic(r, tr),
      score: hits(r.ingredients.map(([k]) => k)),
    })),
  ].sort((a, b) => b.score - a.score);
  if (!options.length) return meals;
  const next = { ...meals };
  const uses = new Map<string, number>();
  for (const m of Object.values(next)) if (m) uses.set(m.title, (uses.get(m.title) ?? 0) + 1);
  for (const { day, meal } of slots) {
    const sameDay = MEALS.map((ml) => next[slotKey(day, ml)]?.title).filter(Boolean);
    const pick = options
      .filter((o) => !sameDay.includes(o.meal.title))
      .sort((a, b) => (uses.get(a.meal.title) ?? 0) - (uses.get(b.meal.title) ?? 0))[0];
    if (!pick) continue;
    next[slotKey(day, meal)] = pick.meal;
    uses.set(pick.meal.title, (uses.get(pick.meal.title) ?? 0) + 1);
  }
  return next;
}
