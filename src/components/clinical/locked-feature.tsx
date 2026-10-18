// Tela de função ainda bloqueada pelo nível do profissional: mostra o que a função oferece,
// quanto falta para o nível e como subir (em vez de só um aviso).
import { Link } from "@tanstack/react-router";
import { Lock, type LucideIcon } from "lucide-react";
import { Card, PageHeader, buttonSecondary } from "@/components/clinical/ui";
import { useTr } from "@/components/appearance-editor";
import type { Names } from "@/lib/appearance-data";
import { PRO_LEVEL_NAMES, type ProStatus } from "@/lib/social/pro-score";

export interface LockedPerk {
  icon: LucideIcon;
  title: Names;
  desc: Names;
}

export function LockedFeature({
  title,
  levelCode,
  intro,
  perks,
  status,
  pendingSetup = false,
  preview,
}: {
  title: string;
  /** Nível em que a função abre (código de PRO_LEVEL_NAMES). */
  levelCode: string;
  intro: Names;
  /** Quatro itens, para a grade 2×2 ficar simétrica. */
  perks: LockedPerk[];
  status?: ProStatus | null;
  pendingSetup?: boolean;
  /** Exemplo de como fica a função depois de liberada (esmaecido, marcado como exemplo). */
  preview?: React.ReactNode;
}) {
  const tr = useTr();
  const level = tr(PRO_LEVEL_NAMES[levelCode] ?? [levelCode, levelCode, levelCode, levelCode]);
  const score = status?.score;
  const goal = status?.nextLevelCode === levelCode ? status.nextLevelScore : undefined;
  const pct = score != null && goal ? Math.min(100, Math.round((score / goal) * 100)) : null;

  return (
    <>
      <PageHeader title={title} />
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {pendingSetup
                ? tr([
                    "Estamos ativando esta função",
                    "We're turning this feature on",
                    "Estamos activando esta función",
                    "Nous activons cette fonction",
                  ])
                : tr([
                    `Abre no nível ${level}`,
                    `Unlocks at the ${level} level`,
                    `Se abre en el nivel ${level}`,
                    `S'ouvre au niveau ${level}`,
                  ])}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {pendingSetup
                ? tr([
                    "Seu nível já é suficiente. Volte em instantes.",
                    "Your level is already high enough. Please come back shortly.",
                    "Tu nivel ya es suficiente. Vuelve en un momento.",
                    "Votre niveau suffit déjà. Revenez bientôt.",
                  ])
                : tr(intro)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {perks.map(({ icon: Icon, title: t, desc }, i) => (
            <div
              key={i}
              className="nc-rise rounded-2xl border border-border/70 bg-secondary/30 p-3 sm:p-4"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{tr(t)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tr(desc)}</p>
            </div>
          ))}
        </div>

        {preview && (
          <div className="relative mt-5" aria-hidden>
            <span className="absolute right-2 top-2 z-10 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {tr(["Exemplo", "Example", "Ejemplo", "Exemple"])}
            </span>
            <div className="pointer-events-none select-none opacity-60">{preview}</div>
          </div>
        )}

        {!pendingSetup && (
          <div className="mt-5 border-t border-border/60 pt-4">
            {pct != null && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{tr(["Seus pontos", "Your points", "Tus puntos", "Vos points"])}</span>
                  <span className="font-semibold text-foreground">
                    {score} / {goal}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={tr([
                    "Progresso até o nível",
                    "Progress to the level",
                    "Progreso hasta el nivel",
                    "Progression vers le niveau",
                  ])}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {tr([
                "Você sobe de nível atendendo, respondendo perguntas, publicando e participando do tema da semana.",
                "You level up by seeing patients, answering questions, posting and joining the weekly theme.",
                "Subes de nivel atendiendo, respondiendo preguntas, publicando y participando en el tema de la semana.",
                "Vous progressez en consultant, en répondant aux questions, en publiant et en participant au thème de la semaine.",
              ])}
            </p>
            <Link to="/painel" className={`${buttonSecondary} mt-3`}>
              {tr(["Ver meu nível", "See my level", "Ver mi nivel", "Voir mon niveau"])}
            </Link>
          </div>
        )}
      </Card>
    </>
  );
}
