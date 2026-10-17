// X1 — Diário de sintomas: anotar o que sentiu e cruzar com o diário alimentar.
// Banco: supabase/migrations/20261017130000_symptom_logs.sql (mesmas regras do diário alimentar).
// As relações são só pistas para conversar na consulta (pode ser coincidência): nada de diagnóstico.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Names } from "@/lib/appearance-data";
import { demoActive } from "@/lib/clinical/demo";

export type SymptomId =
  | "estufamento"
  | "gases"
  | "azia"
  | "dor_barriga"
  | "enjoo"
  | "diarreia"
  | "intestino_preso"
  | "dor_cabeca"
  | "cansaco"
  | "pele"
  | "sono_ruim"
  | "outro";

/** 12 sintomas (grade 3×4 ou 4×3, sem sobra). */
export const SYMPTOMS: { id: SymptomId; names: Names }[] = [
  {
    id: "estufamento",
    names: ["Estufamento", "Bloating", "Hinchazón", "Ballonnements"],
  },
  { id: "gases", names: ["Gases", "Gas", "Gases", "Gaz"] },
  { id: "azia", names: ["Azia", "Heartburn", "Acidez", "Brûlures d'estomac"] },
  {
    id: "dor_barriga",
    names: ["Dor de barriga", "Stomach ache", "Dolor de barriga", "Mal de ventre"],
  },
  { id: "enjoo", names: ["Enjoo", "Nausea", "Náuseas", "Nausée"] },
  { id: "diarreia", names: ["Diarreia", "Diarrhea", "Diarrea", "Diarrhée"] },
  {
    id: "intestino_preso",
    names: ["Intestino preso", "Constipation", "Estreñimiento", "Constipation"],
  },
  {
    id: "dor_cabeca",
    names: ["Dor de cabeça", "Headache", "Dolor de cabeza", "Mal de tête"],
  },
  { id: "cansaco", names: ["Cansaço", "Tiredness", "Cansancio", "Fatigue"] },
  {
    id: "pele",
    names: ["Coceira ou manchas", "Itching or rash", "Picazón o manchas", "Démangeaisons"],
  },
  {
    id: "sono_ruim",
    names: ["Sono ruim", "Poor sleep", "Mal sueño", "Mauvais sommeil"],
  },
  { id: "outro", names: ["Outro", "Other", "Otro", "Autre"] },
];
export const SYMPTOM_BY_ID = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s])) as Record<
  SymptomId,
  (typeof SYMPTOMS)[number]
>;

export const INTENSITY_NAMES: Names[] = [
  ["Leve", "Mild", "Leve", "Léger"],
  ["Médio", "Moderate", "Medio", "Moyen"],
  ["Forte", "Strong", "Fuerte", "Fort"],
];

/**
 * Grupos de alimentos procurados no texto das refeições (por palavras, sem IA). São os que mais
 * aparecem nas conversas sobre desconforto; a lista não diz que eles fazem mal.
 */
export const FOOD_GROUPS: { id: string; names: Names; words: RegExp }[] = [
  {
    id: "leite",
    names: ["Leite e derivados", "Dairy", "Lácteos", "Produits laitiers"],
    words:
      /(?<!\p{L})(leite|queijo|iogurte|requeij|nata|creme de leite|manteiga|coalhada|milk|cheese|yog)/u,
  },
  {
    id: "trigo",
    names: [
      "Trigo (pão, massa, bolo)",
      "Wheat (bread, pasta, cake)",
      "Trigo (pan, pasta, pastel)",
      "Blé (pain, pâtes, gâteau)",
    ],
    words:
      /(?<!\p{L})(p[aã]o|p[aã]es|macarr|massa|lasanha|pizza|bolo|biscoit|bolacha|torrada|trigo|cuscuz paulista|bread|pasta)/u,
  },
  {
    id: "feijao",
    names: [
      "Feijão e grãos",
      "Beans and legumes",
      "Frijoles y legumbres",
      "Haricots et légumineuses",
    ],
    words:
      /(?<!\p{L})(feij[aã]o|feijoada|lentilha|gr[aã]o[- ]de[- ]bico|ervilha|soja|beans?)(?!\p{L})/u,
  },
  {
    id: "fritura",
    names: ["Frituras", "Fried food", "Frituras", "Fritures"],
    words: /(?<!\p{L})(frit[oa]s?|fritura|pastel|coxinha|batata frita|empanad|nuggets?|salgado)/u,
  },
  {
    id: "cafe",
    names: ["Café", "Coffee", "Café", "Café"],
    words: /(?<!\p{L})(caf[eé]|cafezinho|cappuccino|expresso|coffee)(?!\p{L})/u,
  },
  {
    id: "doce",
    names: ["Doces e açúcar", "Sweets and sugar", "Dulces y azúcar", "Sucreries"],
    words:
      /(?<!\p{L})(doce|chocolate|brigadeiro|sorvete|a[cç][uú]car|bala|pudim|bombom|candy|sugar)/u,
  },
  {
    id: "refri",
    names: ["Refrigerante e gás", "Soda and fizzy drinks", "Refrescos con gas", "Sodas"],
    words: /(?<!\p{L})(refri|refrigerante|coca|guaran[aá]|soda|[aá]gua com g[aá]s|energ[eé]tico)/u,
  },
  {
    id: "alcool",
    names: ["Bebida alcoólica", "Alcohol", "Alcohol", "Alcool"],
    words: /(?<!\p{L})(cerveja|vinho|caipirinha|drink|whisky|vodka|cacha[cç]a|beer|wine)/u,
  },
  {
    id: "picante",
    names: ["Pimenta e temperos fortes", "Spicy food", "Picante", "Épicé"],
    words: /(?<!\p{L})(pimenta|picante|apimentad|molho de pimenta|spicy|curry)/u,
  },
  {
    id: "embutido",
    names: [
      "Embutidos e ultraprocessados",
      "Processed meats and snacks",
      "Embutidos y ultraprocesados",
      "Charcuterie et ultra-transformés",
    ],
    words:
      /(?<!\p{L})(salsicha|lingui[cç]a|presunto|salame|mortadela|bacon|miojo|salgadinho|hamb[uú]rguer|cachorro[- ]quente)/u,
  },
  {
    id: "cebola",
    names: ["Cebola e alho", "Onion and garlic", "Cebolla y ajo", "Oignon et ail"],
    words: /(?<!\p{L})(cebola|alho|onion|garlic)(?!\p{L})/u,
  },
  {
    id: "ovo",
    names: ["Ovo", "Egg", "Huevo", "Œuf"],
    words: /(?<!\p{L})(ovos?|omelete|egg)(?!\p{L})/u,
  },
];

export interface SymptomLog {
  id: string;
  patient_id: string;
  felt_at: string;
  symptom: SymptomId;
  intensity: number;
  note: string | null;
}

export interface MealLike {
  eaten_at: string;
  description: string;
}

/** Grupos de alimentos citados no texto de uma refeição. */
export function foodGroupsOf(text: string): string[] {
  const t = text.toLowerCase();
  return FOOD_GROUPS.filter((g) => g.words.test(t)).map((g) => g.id);
}

export interface Relation {
  symptom: SymptomId;
  group: string;
  /** Vezes que o sintoma apareceu (com refeições anotadas antes). */
  events: number;
  /** Dessas, em quantas o grupo foi comido nas horas anteriores. */
  withGroup: number;
  /** Em quantos % dos dias com diário o grupo aparece (a "base" para comparar). */
  baseShare: number;
}

const HOUR = 3_600_000;

/**
 * Relações possíveis entre sintomas e grupos de alimentos: para cada sintoma com pelo menos
 * `minEvents` anotações, quantas vezes cada grupo foi comido entre 30 min e `windowH` horas antes,
 * comparado com a frequência do grupo nos dias com diário. Mostra quando aparece em pelo menos
 * metade das vezes e bem acima do comum (≥ 1,5×). Ordena pelo quanto destoa.
 */
export function findRelations(
  meals: MealLike[],
  logs: Pick<SymptomLog, "felt_at" | "symptom">[],
  { windowH = 24, minEvents = 3 } = {},
): Relation[] {
  const tagged = meals
    .map((m) => ({ at: new Date(m.eaten_at).getTime(), groups: foodGroupsOf(m.description) }))
    .filter((m) => Number.isFinite(m.at));
  if (!tagged.length) return [];

  // Frequência de cada grupo nos dias com diário.
  const days = new Map<string, Set<string>>();
  for (const m of tagged) {
    const d = new Date(m.at).toISOString().slice(0, 10);
    const set = days.get(d) ?? new Set<string>();
    m.groups.forEach((g) => set.add(g));
    days.set(d, set);
  }
  const base = (g: string) => [...days.values()].filter((s) => s.has(g)).length / days.size;

  const out: Relation[] = [];
  const bySymptom = new Map<SymptomId, number[]>();
  for (const l of logs) {
    const at = new Date(l.felt_at).getTime();
    if (!Number.isFinite(at)) continue;
    bySymptom.set(l.symptom, [...(bySymptom.get(l.symptom) ?? []), at]);
  }
  for (const [symptom, times] of bySymptom) {
    if (symptom === "outro") continue;
    // Só conta a vez em que há refeição anotada na janela (sem diário, não dá para saber).
    const before = times
      .map((t) => tagged.filter((m) => m.at <= t - HOUR / 2 && m.at >= t - windowH * HOUR))
      .filter((ms) => ms.length > 0);
    if (before.length < minEvents) continue;
    for (const g of FOOD_GROUPS) {
      const withGroup = before.filter((ms) => ms.some((m) => m.groups.includes(g.id))).length;
      const share = withGroup / before.length;
      const b = base(g.id);
      if (share >= 0.5 && share >= b * 1.5 && withGroup >= 2) {
        out.push({ symptom, group: g.id, events: before.length, withGroup, baseShare: b });
      }
    }
  }
  return out.sort(
    (a, b) =>
      b.withGroup / b.events - b.baseShare - (a.withGroup / a.events - a.baseShare) ||
      b.events - a.events,
  );
}

// ───────────────────────── Banco ─────────────────────────

const KEY = ["symptoms"] as const;
// Modo demonstração (admin): fica só na memória da página.
let demoLogs: SymptomLog[] = [];

async function listSymptoms(patientId: string, days: number): Promise<SymptomLog[]> {
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  if (demoActive()) return demoLogs.filter((l) => l.felt_at >= from);
  const { data, error } = await supabase
    .from("symptom_logs")
    .select("id, patient_id, felt_at, symptom, intensity, note")
    .eq("patient_id", patientId)
    .gte("felt_at", from)
    .order("felt_at", { ascending: false });
  // Sem a migration aplicada, a tela segue funcionando (vazia).
  if (error) return [];
  return (data ?? []) as SymptomLog[];
}

export function useSymptoms(patientId: string | undefined, days = 60) {
  return useQuery({
    queryKey: [...KEY, patientId ?? "", days],
    queryFn: () => listSymptoms(patientId!, days),
    enabled: !!patientId,
  });
}

export function useAddSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      patientId: string;
      symptom: SymptomId;
      intensity: number;
      feltAt: string;
      note: string;
    }) => {
      const row = {
        patient_id: v.patientId,
        symptom: v.symptom,
        intensity: v.intensity,
        felt_at: v.feltAt,
        note: v.note.trim() || null,
      };
      if (demoActive()) {
        demoLogs = [{ id: crypto.randomUUID(), ...row }, ...demoLogs];
        return;
      }
      const { error } = await supabase.from("symptom_logs").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (demoActive()) {
        demoLogs = demoLogs.filter((l) => l.id !== id);
        return;
      }
      const { error } = await supabase.from("symptom_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
