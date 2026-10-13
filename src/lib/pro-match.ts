// "Descobrir a nutri ideal" (N12): as respostas de um questionário curto viram uma nota de
// compatibilidade com cada profissional do diretório (especialidades, profissão, formato, estado,
// valor da consulta e jeito de atender). Tudo é calculado no aparelho, com os dados públicos do
// diretório; nada das respostas é salvo.
import type { Names } from "@/lib/appearance-data";
import type { DirectoryEntry } from "@/lib/clinical/api";
import { professionKey, type ProfessionKey } from "@/lib/clinical/professions";

const n = (pt: string, en: string, es: string, fr: string): Names => [pt, en, es, fr];

export interface MatchGoal {
  id: string;
  label: Names;
  professions: ProfessionKey[];
  /** Pedaços de palavras procurados nas especialidades, no título e na apresentação. */
  keywords: string[];
}

export const MATCH_GOALS: MatchGoal[] = [
  {
    id: "rotina",
    label: n(
      "Comer melhor no dia a dia",
      "Eat better day to day",
      "Comer mejor en el día a día",
      "Mieux manger au quotidien",
    ),
    professions: ["nutricao"],
    keywords: ["educacao alimentar", "reeducacao", "rotina", "cozinha", "dia a dia", "pratic"],
  },
  {
    id: "relacao",
    label: n(
      "Minha relação com a comida e as emoções",
      "My relationship with food and emotions",
      "Mi relación con la comida y las emociones",
      "Ma relation à la nourriture et mes émotions",
    ),
    professions: ["nutricao", "psicologia"],
    keywords: [
      "relacao com a comida",
      "comportament",
      "emoc",
      "ansiedade",
      "intuitiv",
      "mindful",
      "compuls",
    ],
  },
  {
    id: "saude",
    label: n(
      "Uma condição de saúde (diabetes, pressão, intestino...)",
      "A health condition (diabetes, blood pressure, gut...)",
      "Una condición de salud (diabetes, presión, intestino...)",
      "Un problème de santé (diabète, tension, intestin...)",
    ),
    professions: ["nutricao", "medicina"],
    keywords: ["clinic", "condic", "diabet", "hipertens", "intestin", "doenca", "renal", "cardio"],
  },
  {
    id: "familia",
    label: n(
      "A alimentação da família e das crianças",
      "Feeding my family and kids",
      "La alimentación de la familia y los niños",
      "L'alimentation de la famille et des enfants",
    ),
    professions: ["nutricao"],
    keywords: ["famil", "infantil", "crianca", "materno", "gestac", "pediatr"],
  },
  {
    id: "treino",
    label: n(
      "Treino, esporte e disposição",
      "Training, sport and energy",
      "Entrenamiento, deporte y energía",
      "Sport, entraînement et énergie",
    ),
    professions: ["nutricao", "educacao_fisica"],
    keywords: ["esport", "treino", "atividade fisica", "massa", "desempenho", "hipertrofia"],
  },
  {
    id: "bemestar",
    label: n(
      "Sono, energia e bem-estar",
      "Sleep, energy and well-being",
      "Sueño, energía y bienestar",
      "Sommeil, énergie et bien-être",
    ),
    professions: ["nutricao", "psicologia"],
    keywords: ["bem-estar", "bem estar", "sono", "energia", "qualidade de vida", "estresse"],
  },
];

export type MatchModality = "online" | "presencial" | "any";
export type MatchStyle = "acolhedor" | "pratico" | "proximo" | "any";

export interface MatchAnswers {
  goal: string;
  profession: ProfessionKey | "any";
  modality: MatchModality;
  uf: string | null;
  /** Valor máximo por consulta, em centavos (null = tanto faz). */
  budget: number | null;
  style: MatchStyle;
}

const STYLE_WORDS: Record<Exclude<MatchStyle, "any">, string[]> = {
  acolhedor: ["acolh", "escuta", "sem julgamento", "empat", "gentil", "humaniz"],
  pratico: ["pratic", "objetiv", "plano", "direto", "simples"],
  proximo: ["acompanhamento", "mensag", "proxim", "suporte", "semanal"],
};

const fold = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type MatchReason =
  | { kind: "specialty"; text: string }
  | { kind: "profession" }
  | { kind: "online" }
  | { kind: "presencial"; uf: string | null }
  | { kind: "budget" }
  | { kind: "style" };

export interface MatchResult {
  pro: DirectoryEntry;
  score: number;
  reasons: MatchReason[];
}

/** Nota (0 a 100) de cada profissional que está recebendo pacientes, da maior para a menor. */
export function rankProfessionals(list: DirectoryEntry[], a: MatchAnswers): MatchResult[] {
  const goal = MATCH_GOALS.find((g) => g.id === a.goal) ?? MATCH_GOALS[0];
  return list
    .filter((p) => p.accepting_patients && p.id)
    .filter((p) =>
      a.modality === "online"
        ? !!p.offers_online
        : a.modality === "presencial"
          ? !!p.offers_presential
          : true,
    )
    .map((p): MatchResult => {
      const reasons: MatchReason[] = [];
      let score = 0;

      // Especialidades (o que mais pesa), depois o título e a apresentação.
      const hit = (p.specialties ?? []).find((sp) =>
        goal.keywords.some((k) => fold(sp).includes(k)),
      );
      if (hit) {
        score += 40;
        reasons.push({ kind: "specialty", text: hit });
      } else if (goal.keywords.some((k) => fold(`${p.headline} ${p.bio}`).includes(k))) {
        score += 25;
      }

      const key = professionKey(p.profession);
      if (a.profession !== "any") {
        if (key === a.profession) {
          score += 20;
          reasons.push({ kind: "profession" });
        } else score -= 15; // Outra profissão: ainda aparece, mas depois de quem é da escolhida.
      } else if (goal.professions.includes(key)) score += 15;
      else score += 5;

      if (a.modality === "online" || (a.modality === "any" && p.offers_online)) {
        score += a.modality === "online" ? 15 : 12;
        if (p.offers_online) reasons.push({ kind: "online" });
      } else if (a.modality === "presencial" || p.offers_presential) {
        score += a.modality === "presencial" ? 15 : 10;
      }

      // Estado: só importa para consulta presencial.
      if (a.modality === "presencial") {
        if (a.uf && p.uf === a.uf) {
          score += 10;
          reasons.push({ kind: "presencial", uf: p.uf });
        }
      } else score += 10;

      const price = p.consultation_price_cents;
      if (a.budget == null) score += 10;
      else if (price != null && price <= a.budget) {
        score += 10;
        reasons.push({ kind: "budget" });
      } else if (price == null) score += 5;

      if (a.style !== "any") {
        if (STYLE_WORDS[a.style].some((k) => fold(`${p.headline} ${p.bio}`).includes(k))) {
          score += 5;
          reasons.push({ kind: "style" });
        }
      } else score += 5;

      return { pro: p, score: Math.max(0, Math.min(100, score)), reasons };
    })
    .sort((x, y) => y.score - x.score || fold(x.pro.name).localeCompare(fold(y.pro.name)));
}

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
