// Cenas de conquista em tela inteira ("cena de filme"): subir de nível, fechar um capítulo da trilha,
// ganhar uma conquista ou terminar um desafio. Qualquer tela pede uma cena com playCinematic(); a
// camada HeroCinematic (montada no __root) recebe a cena pelo evento e toca uma por vez, na ordem.
import type { CharacterId } from "@/lib/trail-types";

export type CinematicKind = "levelup" | "chapter" | "achievement" | "challenge";

export interface CinematicSpec {
  kind: CinematicKind;
  /** Frase pequena acima do título (ex.: "Novo nível"). Sem ela, usa a do tipo. */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Emoji do emblema central. */
  emblem: string;
  /** Quem aparece na cena (o primeiro fica no centro). */
  cast?: CharacterId[];
  /** Fala do personagem central. */
  line?: string;
  /** Conquistas extras ganhas no mesmo momento (aparecem como selos). */
  extras?: { icon: string; title: string }[];
}

export const CINEMATIC_EVENT = "nc:cinematic";

export function playCinematic(spec: CinematicSpec) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CinematicSpec>(CINEMATIC_EVENT, { detail: spec }));
}

export const ALL_HEROES: CharacterId[] = ["nina", "lipe", "mila", "tito", "cadu"];
