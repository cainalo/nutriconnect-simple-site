// Revisão espaçada na página da trilha: as paradas douradas voltam para uma revisão relâmpago depois
// de 1, 3, 7, 14, 30 e 60 dias. Na história, é o inimigo já vencido tentando voltar.
import { RotateCcw, Sparkles } from "lucide-react";
import { StoryEnemy } from "@/components/story-enemy";
import { useTr } from "@/components/settings-ui";
import {
  daysUntil,
  dueReviews,
  nextReviewDay,
  type Stop,
  type Trail,
  type TrailProgress,
  type Unit,
} from "@/lib/learning-trail";
import { enemyOfStop } from "@/lib/trail-story";

export function ReviewPanel({
  trails,
  progress,
  onReview,
}: {
  trails: Trail[];
  progress: TrailProgress;
  onReview: (stop: Stop, unit: Unit, trail: Trail) => void;
}) {
  const tr = useTr();
  const due = dueReviews(progress, trails);
  const next = due.length ? null : nextReviewDay(progress, trails);
  if (!due.length && !next) return null;

  if (!due.length && next) {
    const days = Math.max(1, daysUntil(next));
    return (
      <p className="mb-6 flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
        <RotateCcw className="h-4 w-4 shrink-0 text-primary" />
        {tr([
          "Nenhuma revisão pendente. A próxima é em {n} dia(s).",
          "No reviews due. The next one is in {n} day(s).",
          "No hay repasos pendientes. El próximo es en {n} día(s).",
          "Aucune révision en attente. La prochaine est dans {n} jour(s).",
        ]).replace("{n}", String(days))}
      </p>
    );
  }

  const shown = due.slice(0, 3);
  return (
    <section className="mb-8 overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-100/70 via-card to-card p-4 shadow-sm dark:from-amber-950/40 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-sm">
          <RotateCcw className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-tight text-foreground">
            {tr(["Revisão do dia", "Today's review", "Repaso del día", "Révision du jour"])}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tr([
              "Inimigos já vencidos estão tentando voltar! Uma revisão rápida (8 perguntas) mantém o que você aprendeu.",
              "Defeated enemies are trying to come back! A quick review (8 questions) keeps what you learned.",
              "¡Enemigos ya vencidos intentan volver! Un repaso rápido (8 preguntas) mantiene lo que aprendiste.",
              "Des ennemis vaincus essaient de revenir ! Une révision rapide (8 questions) garde ce que vous avez appris.",
            ])}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {shown.map(({ stop, unit, trail }) => {
          const def = enemyOfStop(stop.id);
          return (
            <li
              key={stop.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/90 p-2.5"
            >
              {def ? (
                <StoryEnemy def={def} state="taunt" className="h-12 w-11 shrink-0" />
              ) : (
                <span className="grid h-12 w-11 shrink-0 place-items-center">
                  <RotateCcw className="h-6 w-6 text-amber-600" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-foreground">{stop.title}</p>
                {def && (
                  <p className="truncate text-[11px] text-muted-foreground">{tr(def.name)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onReview(stop, unit, trail)}
                className="shrink-0 cursor-pointer rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white shadow-[0_3px_0_0_#b45309] transition hover:brightness-105 active:translate-y-0.5 active:shadow-none"
              >
                {tr(["Revisar", "Review", "Repasar", "Réviser"])}
              </button>
            </li>
          );
        })}
      </ul>
      {due.length > shown.length && (
        <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
          {tr([
            "+{n} esperando a vez",
            "+{n} waiting their turn",
            "+{n} esperando su turno",
            "+{n} en attente",
          ]).replace("{n}", String(due.length - shown.length))}
        </p>
      )}
    </section>
  );
}
