// Cenas de filme em tela inteira (cutscenes). Qualquer tela pede uma cena: playCutscene() para os
// roteiros da história (lib/trail-story) ou playCinematic() para os momentos de conquista (subir de
// nível, ganhar uma conquista, vencer um desafio), que viram pequenas cenas com a turma. A camada
// HeroCinematic (montada no __root) recebe as cenas pelo evento e toca uma por vez, na ordem.
import type { Names } from "@/lib/appearance-data";
import type { CharacterId } from "@/lib/trail-types";
import type { CastMember, Cutscene, Slot } from "@/lib/trail-story";

export type CinematicKind = "levelup" | "chapter" | "achievement" | "challenge";

export interface CinematicSpec {
  kind: CinematicKind;
  /** Frase pequena acima do título (ex.: "Novo nível"). Sem ela, usa a do tipo. */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Emoji do emblema central (vira ícone). */
  emblem: string;
  /** Quem aparece na cena (o primeiro fica no centro). */
  cast?: CharacterId[];
  /** Fala do personagem central. */
  line?: string;
  /** Conquistas extras ganhas no mesmo momento (aparecem como selos). */
  extras?: { icon: string; title: string }[];
}

export const CINEMATIC_EVENT = "nc:cinematic";

export const ALL_HEROES: CharacterId[] = ["nina", "lipe", "mila", "tito", "cadu"];

export function playCutscene(scene: Cutscene) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Cutscene>(CINEMATIC_EVENT, { detail: scene }));
}

export function playCinematic(spec: CinematicSpec) {
  playCutscene(celebrationScene(spec));
}

const n = (pt: string, en: string, es: string, fr: string): Names => [pt, en, es, fr];

const KICKER: Record<CinematicKind, Names> = {
  levelup: n("Novo nível", "New level", "Nuevo nivel", "Nouveau niveau"),
  chapter: n("Capítulo concluído", "Chapter complete", "Capítulo completado", "Chapitre terminé"),
  achievement: n(
    "Conquista desbloqueada",
    "Achievement unlocked",
    "Logro desbloqueado",
    "Succès débloqué",
  ),
  challenge: n("Desafio vencido", "Challenge won", "Desafío superado", "Défi relevé"),
};

/** A primeira fala de cada tipo de cena, antes da revelação. */
const OPENING: Record<CinematicKind, Names> = {
  levelup: n(
    "Que caminhada! Senta aqui perto da fogueira... Sente isso? Você ficou mais forte.",
    "What a journey! Sit here by the fire... Feel that? You've grown stronger.",
    "¡Qué caminata! Siéntate junto al fuego... ¿Lo sientes? Te hiciste más fuerte.",
    "Quel voyage ! Assieds-toi près du feu... Tu le sens ? Tu es devenu plus fort.",
  ),
  chapter: n(
    "Olha só para trás: a névoa ficou para trás. Um novo trecho da jornada se abre.",
    "Look back: the fog is behind us. A new stretch of the journey opens.",
    "Mira atrás: la niebla quedó atrás. Se abre un nuevo tramo del viaje.",
    "Regarde derrière toi : le brouillard est passé. Un nouveau chemin s'ouvre.",
  ),
  achievement: n(
    "Espera... o que é aquilo brilhando no caminho?",
    "Wait... what's that shining on the path?",
    "Espera... ¿qué es eso que brilla en el camino?",
    "Attends... qu'est-ce qui brille sur le chemin ?",
  ),
  challenge: n(
    "A vila inteira acompanhou o seu desafio. Chegou a hora da recompensa!",
    "The whole village followed your challenge. Time for the reward!",
    "Todo el pueblo siguió tu desafío. ¡Llegó la hora de la recompensa!",
    "Tout le village a suivi ton défi. C'est l'heure de la récompense !",
  ),
};

const SLOTS: Slot[] = ["center", "left", "right", "far-left", "far-right"];

function cast(ids: CharacterId[], action: CastMember["action"]): CastMember[] {
  return ids.slice(0, 5).map((id, i) => ({
    id,
    at: SLOTS[i],
    action:
      i === 0
        ? action
        : action === "cheer"
          ? (["dance", "jump", "spin", "cheer"] as const)[i % 4]
          : action,
    enter: i % 2 ? "right" : "left",
  }));
}

/** Momento de conquista como uma pequena cena: a conversa, a revelação do emblema e a festa. */
export function celebrationScene(spec: CinematicSpec): Cutscene {
  const ids = spec.cast?.length ? spec.cast : ALL_HEROES;
  const lead = ids[0];
  const night = spec.kind === "levelup";
  const opening = night ? "camp" : spec.kind === "challenge" ? "village" : "dawn";
  const few = spec.kind === "achievement" ? ids.slice(0, 3) : ids;
  return {
    id: `celebration:${spec.kind}:${spec.title}`,
    label: spec.kicker ?? KICKER[spec.kind],
    shots: [
      {
        bg: opening,
        camera: "pull",
        music: "calm",
        cast: cast(few, spec.kind === "achievement" ? "think" : "idle"),
        lines: [{ who: lead, text: OPENING[spec.kind] }],
      },
      {
        bg: "dawn",
        camera: "push",
        music: "fanfare",
        emblem: spec.emblem,
        title: { kicker: spec.kicker ?? KICKER[spec.kind], text: spec.title, sub: spec.subtitle },
        badges: spec.extras,
        fx: ["flash", "rays", "confetti"],
        hold: 4200,
      },
      {
        bg: "dawn",
        camera: "heroes",
        cast: cast(ids, "cheer"),
        fx: ["confetti"],
        lines: spec.line ? [{ who: lead, text: spec.line }] : [],
        hold: 2600,
      },
    ],
  };
}
