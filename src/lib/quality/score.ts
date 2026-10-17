// Contas do painel de qualidade: a nota mais recente de cada item em cada critério, médias por item,
// por área e por critério, e a evolução de um item entre rodadas.
import { CATALOG } from "@/lib/quality/catalog";
import type { AreaId } from "@/lib/quality/catalog-types";
import { CRITERIA, type CriterionId } from "@/lib/quality/criteria";
import { ROUNDS, type QualityRound } from "@/lib/quality/results";

export interface LatestScore {
  score: number;
  round: number;
}

export interface ItemSummary {
  id: string;
  /** Nota mais recente por critério (com a rodada em que foi dada). */
  latest: Partial<Record<CriterionId, LatestScore>>;
  /** Média das notas mais recentes (null = nunca avaliado). */
  average: number | null;
  /** O que melhorar e o que está bom, da rodada mais recente que avaliou o item. */
  improve: string[];
  good: string[];
  lastRound: number | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarizeItem(id: string, rounds: QualityRound[] = ROUNDS): ItemSummary {
  const latest: ItemSummary["latest"] = {};
  let improve: string[] = [];
  let good: string[] = [];
  let lastRound: number | null = null;
  for (const r of rounds) {
    const res = r.items[id];
    if (!res) continue;
    lastRound = r.round;
    improve = res.improve ?? [];
    good = res.good ?? [];
    for (const [c, s] of Object.entries(res.scores)) {
      if (typeof s === "number") latest[c as CriterionId] = { score: s, round: r.round };
    }
  }
  const values = Object.values(latest).map((l) => l!.score);
  return { id, latest, average: mean(values), improve, good, lastRound };
}

export function summarizeAll(rounds: QualityRound[] = ROUNDS) {
  const items = CATALOG.map((i) => summarizeItem(i.id, rounds));
  const byId = Object.fromEntries(items.map((s) => [s.id, s])) as Record<string, ItemSummary>;
  const rated = items.filter((s) => s.average !== null);
  const criterion = Object.fromEntries(
    CRITERIA.map((c) => [
      c.id,
      mean(rated.flatMap((s) => (s.latest[c.id] ? [s.latest[c.id]!.score] : []))),
    ]),
  ) as Record<CriterionId, number | null>;
  const areaAverage = (area: AreaId) =>
    mean(
      CATALOG.filter((i) => i.area === area)
        .map((i) => byId[i.id].average)
        .filter((v): v is number => v !== null),
    );
  return {
    items,
    byId,
    rated: rated.length,
    total: items.length,
    overall: mean(rated.map((s) => s.average!)),
    criterion,
    areaAverage,
  };
}

/** Média do item em cada rodada que o avaliou (para a linha de evolução). */
export function itemHistory(id: string, rounds: QualityRound[] = ROUNDS) {
  return rounds
    .filter((r) => r.items[id])
    .map((r) => ({
      round: r.round,
      date: r.date,
      average: mean(
        Object.values(r.items[id].scores).filter((v): v is number => typeof v === "number"),
      ),
    }));
}

/** Cor da nota (0–10): vermelho, âmbar, verde. */
export function scoreTone(score: number | null) {
  if (score === null) return "bg-secondary text-muted-foreground";
  if (score >= 9) return "bg-emerald-600 text-white";
  if (score >= 7) return "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300";
  if (score >= 5) return "bg-amber-400/25 text-amber-800 dark:text-amber-300";
  return "bg-red-500/20 text-red-700 dark:text-red-300";
}

export const pct = (score: number | null) => (score === null ? "—" : `${Math.round(score * 10)}%`);
