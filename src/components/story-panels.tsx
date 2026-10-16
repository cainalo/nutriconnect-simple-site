// Peças da história da trilha fora das cenas: o cartão do inimigo de cada parada (com os pontos de
// vida que faltam e as cenas para rever), os botões de cenas do capítulo e o placar de batalha que
// aparece durante a lição.
import { Clapperboard, Swords } from "lucide-react";
import { StoryEnemy } from "@/components/story-enemy";
import { useTr } from "@/components/settings-ui";
import { playCutscene } from "@/lib/cinematic";
import type { ProfileKind, Stop, Unit } from "@/lib/trail-types";
import {
  chapterFinaleScene,
  chapterIntroScene,
  chapterOf,
  defeatScene,
  encounterScene,
  enemyOfStop,
  prologueScene,
  type EnemyDef,
  type EnemyState,
} from "@/lib/trail-story";

const pill =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition active:translate-y-px";

/** Cartão do inimigo na folha da parada: quem é, quanto falta para vencer e as cenas. */
export function StopEnemyCard({
  stop,
  unit,
  kind,
  done,
}: {
  stop: Stop;
  unit: Unit;
  kind: ProfileKind;
  done: number;
}) {
  const tr = useTr();
  const def = enemyOfStop(stop.id);
  if (!def) return null;
  const defeated = done >= 3;
  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 p-3"
      style={{
        borderColor: `color-mix(in srgb, ${def.color} 35%, transparent)`,
        background: `linear-gradient(120deg, color-mix(in srgb, ${def.color} 14%, var(--card)), var(--card))`,
      }}
    >
      <div className="relative h-20 w-[4.5rem] shrink-0">
        <StoryEnemy
          def={def}
          state={defeated ? "idle" : "taunt"}
          className={`h-full w-full ${defeated ? "opacity-50 grayscale" : ""}`}
        />
        {defeated && (
          <span className="absolute inset-0 grid place-items-center">
            <Swords className="h-8 w-8 text-emerald-600 drop-shadow" strokeWidth={2.4} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: def.color }}
        >
          {defeated
            ? tr(["Inimigo derrotado", "Enemy defeated", "Enemigo derrotado", "Ennemi vaincu"])
            : def.boss
              ? tr([
                  "Chefão desta parada",
                  "This stop's boss",
                  "Jefe de esta parada",
                  "Boss de l'étape",
                ])
              : tr([
                  "Inimigo desta parada",
                  "This stop's enemy",
                  "Enemigo de esta parada",
                  "Ennemi de l'étape",
                ])}
        </p>
        <p className="truncate font-display text-base font-black leading-tight text-foreground">
          {tr(def.name)}
        </p>
        <div className="mt-1.5 flex items-center gap-1" aria-label={`${3 - Math.min(done, 3)}/3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 flex-1 rounded-full"
              style={{
                background:
                  i < 3 - Math.min(done, 3)
                    ? `linear-gradient(90deg, ${def.color}, ${def.color2})`
                    : "var(--secondary)",
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              const s = encounterScene(stop, unit, kind);
              if (s) playCutscene(s);
            }}
            className={`${pill} bg-secondary text-foreground hover:bg-secondary/70`}
          >
            <Clapperboard className="h-3.5 w-3.5" />
            {tr(["Ver encontro", "Watch encounter", "Ver encuentro", "Voir la rencontre"])}
          </button>
          {defeated && (
            <button
              type="button"
              onClick={() => {
                const s = defeatScene(stop, unit, kind);
                if (s) playCutscene(s);
              }}
              className={`${pill} bg-amber-400/20 text-amber-700 hover:bg-amber-400/30 dark:text-amber-300`}
            >
              <Clapperboard className="h-3.5 w-3.5" />
              {tr([
                "Rever a vitória",
                "Replay the victory",
                "Ver la victoria",
                "Revoir la victoire",
              ])}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Botões das cenas do capítulo, no cabeçalho de cada unidade do mapa. */
export function ChapterScenes({
  unit,
  kind,
  first,
  gold,
}: {
  unit: Unit;
  kind: ProfileKind;
  /** Primeiro capítulo da trilha: também oferece o prólogo. */
  first: boolean;
  gold: boolean;
}) {
  const tr = useTr();
  const chapter = chapterOf(unit.id);
  if (!chapter) return null;
  const btn = `${pill} bg-black/20 text-inherit hover:bg-black/30`;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-85">
        {tr(["Capítulo", "Chapter", "Capítulo", "Chapitre"])} {chapter.number} · {tr(chapter.title)}
      </span>
      <span className="flex flex-wrap gap-1.5">
        {first && (
          <button type="button" className={btn} onClick={() => playCutscene(prologueScene(kind))}>
            <Clapperboard className="h-3.5 w-3.5" />
            {tr(["Prólogo", "Prologue", "Prólogo", "Prologue"])}
          </button>
        )}
        <button
          type="button"
          className={btn}
          onClick={() => playCutscene(chapterIntroScene(chapter))}
        >
          <Clapperboard className="h-3.5 w-3.5" />
          {tr(["Abertura", "Opening", "Apertura", "Ouverture"])}
        </button>
        {gold && (
          <button
            type="button"
            className={btn}
            onClick={() => playCutscene(chapterFinaleScene(chapter, kind))}
          >
            <Clapperboard className="h-3.5 w-3.5" />
            {tr(["Final", "Ending", "Final", "Fin"])}
          </button>
        )}
      </span>
    </div>
  );
}

/** Placar da batalha durante a lição: o inimigo reage a cada resposta. */
export function BattleHud({
  def,
  hp,
  state,
}: {
  def: EnemyDef;
  /** 0–1: vida que resta ao inimigo. */
  hp: number;
  state: EnemyState;
}) {
  const tr = useTr();
  const pct = Math.round(Math.max(0, Math.min(1, hp)) * 100);
  return (
    <div
      className="mx-4 mb-1 flex items-center gap-3 rounded-2xl border px-3 py-1.5 sm:mx-5"
      style={{
        borderColor: `color-mix(in srgb, ${def.color} 30%, transparent)`,
        background: `color-mix(in srgb, ${def.color} 10%, var(--card))`,
      }}
    >
      <StoryEnemy def={def} state={state} className="h-12 w-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-black text-foreground">{tr(def.name)}</span>
          <span
            className="shrink-0 text-[10px] font-black tabular-nums"
            style={{ color: def.color }}
          >
            {pct}%
          </span>
        </div>
        <div
          className="mt-1 h-2.5 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label={tr([
            "Vida do inimigo",
            "Enemy health",
            "Vida del enemigo",
            "Vie de l'ennemi",
          ])}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${def.color}, ${def.color2})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
