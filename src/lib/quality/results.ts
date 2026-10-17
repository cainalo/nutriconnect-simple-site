// Notas das rodadas de teste de qualidade (docs/QUALIDADE.md). Cada rodada avalia itens do
// catálogo (lib/quality/catalog.ts) nos critérios de lib/quality/criteria.ts, de 0 a 10.
// Uma rodada nova entra no FIM da lista; o painel Admin → Qualidade mostra a nota mais recente
// de cada item em cada critério e a evolução entre rodadas. Nunca apague rodadas antigas.
import type { CriterionId } from "@/lib/quality/criteria";

export interface ItemResult {
  /** Nota de 0 a 10 por critério (critério sem nota = não avaliado nesta rodada). */
  scores: Partial<Record<CriterionId, number>>;
  /** O que precisa melhorar, em frases curtas (vira a lista de tarefas da próxima etapa). */
  improve?: string[];
  /** O que já está bom e não deve ser perdido. */
  good?: string[];
}

export interface QualityRound {
  /** Número da rodada (1, 2, 3…). */
  round: number;
  /** Data da avaliação (AAAA-MM-DD). */
  date: string;
  /** Quem avaliou e como (ex.: "Claude, prints no harness + leitura do código"). */
  method: string;
  /** Resultado por item do catálogo (id do item). */
  items: Record<string, ItemResult>;
}

export const ROUNDS: QualityRound[] = [];
