// Questionário "Descobrir a nutri ideal" (N12): 6 perguntas rápidas, uma por vez, e os 3
// profissionais que mais combinam, com a nota e os motivos. Usa o diretório público
// (lib/pro-match); as respostas ficam só na tela.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HandHeart,
  MapPin,
  MessagesSquare,
  RotateCcw,
  Sparkles,
  Video,
  Wallet,
  Zap,
} from "lucide-react";
import { VerifiedBadge } from "@/components/person-chip";
import { Avatar } from "@/components/clinical/ui";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import type { Names } from "@/lib/appearance-data";
import { formatMoney } from "@/lib/clinical/format";
import type { ProfessionKey } from "@/lib/clinical/professions";
import { useDirectory } from "@/lib/clinical/queries";
import {
  MATCH_GOALS,
  UFS,
  rankProfessionals,
  type MatchAnswers,
  type MatchModality,
  type MatchReason,
  type MatchStyle,
} from "@/lib/pro-match";
import { cn } from "@/lib/utils";

type Option<T> = { value: T; label: Names };

const PROFESSIONS: Option<ProfessionKey | "any">[] = [
  { value: "nutricao", label: ["Nutricionista", "Dietitian", "Nutricionista", "Diététicien(ne)"] },
  { value: "psicologia", label: ["Psicólogo(a)", "Psychologist", "Psicólogo(a)", "Psychologue"] },
  { value: "medicina", label: ["Médico(a)", "Doctor", "Médico(a)", "Médecin"] },
  {
    value: "educacao_fisica",
    label: ["Educador(a) físico(a)", "Fitness coach", "Educador(a) físico(a)", "Coach sportif"],
  },
  { value: "any", label: ["Tanto faz", "No preference", "Me da igual", "Peu importe"] },
];

const MODALITIES: Option<MatchModality>[] = [
  {
    value: "online",
    label: ["Online, por vídeo", "Online, by video", "Online, por video", "En ligne, en vidéo"],
  },
  { value: "presencial", label: ["Presencial", "In person", "Presencial", "En présentiel"] },
  { value: "any", label: ["Tanto faz", "No preference", "Me da igual", "Peu importe"] },
];

const BUDGETS: Option<number | null>[] = [
  { value: 12000, label: ["Até R$ 120", "Up to R$ 120", "Hasta R$ 120", "Jusqu'à 120 R$"] },
  { value: 20000, label: ["Até R$ 200", "Up to R$ 200", "Hasta R$ 200", "Jusqu'à 200 R$"] },
  { value: 30000, label: ["Até R$ 300", "Up to R$ 300", "Hasta R$ 300", "Jusqu'à 300 R$"] },
  { value: null, label: ["Tanto faz", "No preference", "Me da igual", "Peu importe"] },
];

const STYLES: (Option<MatchStyle> & { icon: typeof HandHeart })[] = [
  {
    value: "acolhedor",
    icon: HandHeart,
    label: [
      "Acolhedor e sem pressão",
      "Warm and pressure-free",
      "Cálido y sin presión",
      "Bienveillant et sans pression",
    ],
  },
  {
    value: "pratico",
    icon: Zap,
    label: [
      "Prático e direto ao ponto",
      "Practical and to the point",
      "Práctico y directo",
      "Pratique et direct",
    ],
  },
  {
    value: "proximo",
    icon: MessagesSquare,
    label: [
      "Bem próximo entre as consultas",
      "Close support between visits",
      "Muy cercano entre consultas",
      "Très présent entre les séances",
    ],
  },
  {
    value: "any",
    icon: Sparkles,
    label: ["Tanto faz", "No preference", "Me da igual", "Peu importe"],
  },
];

const STEPS = 6;

export function ProMatchQuiz({ onPicked }: { onPicked?: () => void }) {
  const tr = useTr();
  const { locale } = useI18n();
  const directory = useDirectory();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<MatchAnswers>>({ uf: null });

  const results = useMemo(
    () =>
      step >= STEPS && directory.data
        ? rankProfessionals(directory.data, {
            goal: answers.goal ?? MATCH_GOALS[0].id,
            profession: answers.profession ?? "any",
            modality: answers.modality ?? "any",
            uf: answers.uf ?? null,
            budget: answers.budget ?? null,
            style: answers.style ?? "any",
          }).slice(0, 3)
        : [],
    [step, directory.data, answers],
  );

  const choose = <K extends keyof MatchAnswers>(key: K, value: MatchAnswers[K]) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    // Estado só importa para quem quer presencial: pula a pergunta nos outros casos.
    setStep((s) => (key === "modality" && value !== "presencial" ? s + 2 : s + 1));
  };
  const back = () =>
    setStep((s) => (s === 4 && answers.modality !== "presencial" ? 2 : Math.max(0, s - 1)));

  const reasonText = (r: MatchReason, price: number | null) => {
    switch (r.kind) {
      case "specialty":
        return r.text;
      case "profession":
        return tr([
          "A profissão que você quer",
          "The profession you want",
          "La profesión que buscas",
          "La profession voulue",
        ]);
      case "online":
        return tr(["Atende online", "Sees patients online", "Atiende online", "Consulte en ligne"]);
      case "presencial":
        return `${tr(["Presencial em", "In person in", "Presencial en", "En présentiel :"])} ${r.uf}`;
      case "budget":
        return price != null
          ? formatMoney(price, locale)
          : tr(["No orçamento", "Within budget", "En el presupuesto", "Dans le budget"]);
      case "style":
        return tr([
          "Jeito de atender que combina",
          "A matching style",
          "Un estilo que combina",
          "Un style qui vous va",
        ]);
    }
  };

  const question = (title: Names, body: React.ReactNode) => (
    <div key={step} className="nc-rise">
      <h3 className="font-display text-lg font-bold leading-tight text-foreground">{tr(title)}</h3>
      <div className="mt-3 space-y-2">{body}</div>
    </div>
  );
  const optionBtn = (
    active: boolean,
    label: string,
    onClick: () => void,
    icon?: React.ReactNode,
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-left text-sm font-semibold transition active:scale-[0.99]",
        active
          ? "border-primary bg-primary-soft/50 text-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {active && <Check className="h-4 w-4 text-primary" />}
    </button>
  );

  return (
    <div className="min-w-0 rounded-3xl border border-border/70 bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-xs font-black uppercase tracking-widest text-accent">
          {tr([
            "Descobrir a nutri ideal",
            "Find your ideal pro",
            "Descubrir tu nutri ideal",
            "Trouver le bon pro",
          ])}
        </span>
      </div>
      {step < STEPS && (
        <div className="mb-4 flex gap-1" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-secondary")}
            />
          ))}
        </div>
      )}

      {step === 0 &&
        question(
          [
            "O que você mais quer cuidar agora?",
            "What do you most want to work on now?",
            "¿Qué quieres cuidar más ahora?",
            "Sur quoi voulez-vous travailler ?",
          ],
          MATCH_GOALS.map((g) => (
            <div key={g.id}>
              {optionBtn(answers.goal === g.id, tr(g.label), () => choose("goal", g.id))}
            </div>
          )),
        )}
      {step === 1 &&
        question(
          [
            "Com que profissional?",
            "With which professional?",
            "¿Con qué profesional?",
            "Avec quel professionnel ?",
          ],
          PROFESSIONS.map((o) => (
            <div key={o.value}>
              {optionBtn(answers.profession === o.value, tr(o.label), () =>
                choose("profession", o.value),
              )}
            </div>
          )),
        )}
      {step === 2 &&
        question(
          [
            "Como prefere a consulta?",
            "How do you prefer to meet?",
            "¿Cómo prefieres la consulta?",
            "Comment préférez-vous consulter ?",
          ],
          MODALITIES.map((o) => (
            <div key={o.value}>
              {optionBtn(
                answers.modality === o.value,
                tr(o.label),
                () => choose("modality", o.value),
                o.value === "online" ? (
                  <Video className="h-4 w-4 text-primary" />
                ) : o.value === "presencial" ? (
                  <MapPin className="h-4 w-4 text-primary" />
                ) : undefined,
              )}
            </div>
          )),
        )}
      {step === 3 &&
        question(
          [
            "Em que estado você está?",
            "Which state are you in?",
            "¿En qué estado estás?",
            "Dans quel État êtes-vous ?",
          ],
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
            {UFS.map((uf) => (
              <button
                key={uf}
                type="button"
                onClick={() => choose("uf", uf)}
                aria-pressed={answers.uf === uf}
                className={cn(
                  "cursor-pointer rounded-xl border-2 py-2 text-xs font-black transition",
                  answers.uf === uf
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                {uf}
              </button>
            ))}
          </div>,
        )}
      {step === 4 &&
        question(
          [
            "Quanto quer investir por consulta?",
            "How much per consultation?",
            "¿Cuánto quieres invertir por consulta?",
            "Quel budget par consultation ?",
          ],
          BUDGETS.map((o) => (
            <div key={String(o.value)}>
              {optionBtn(
                answers.budget === o.value,
                tr(o.label),
                () => choose("budget", o.value),
                <Wallet className="h-4 w-4 text-primary" />,
              )}
            </div>
          )),
        )}
      {step === 5 &&
        question(
          [
            "Que jeito de atender combina com você?",
            "Which care style suits you?",
            "¿Qué estilo de atención te va?",
            "Quel style d'accompagnement vous convient ?",
          ],
          STYLES.map((o) => (
            <div key={o.value}>
              {optionBtn(
                answers.style === o.value,
                tr(o.label),
                () => choose("style", o.value),
                <o.icon className="h-4 w-4 text-primary" />,
              )}
            </div>
          )),
        )}

      {step >= STEPS && (
        <div className="nc-rise">
          <h3 className="font-display text-lg font-bold leading-tight text-foreground">
            {tr([
              "Quem mais combina com você",
              "Your best matches",
              "Quién más combina contigo",
              "Vos meilleures correspondances",
            ])}
          </h3>
          {directory.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {tr(["Procurando...", "Searching...", "Buscando...", "Recherche..."])}
            </p>
          ) : results.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {tr([
                "Ninguém recebendo pacientes com essas escolhas agora. Tente outro formato ou veja a lista completa.",
                "Nobody taking patients with these choices right now. Try another format or see the full list.",
                "Nadie recibe pacientes con estas opciones ahora. Prueba otro formato o mira la lista completa.",
                "Personne ne reçoit avec ces choix pour le moment. Essayez un autre format ou voyez la liste complète.",
              ])}
            </p>
          ) : (
            <ol className="mt-3 space-y-2.5">
              {results.map(({ pro, score, reasons }, i) => (
                <li
                  key={pro.id}
                  className="rounded-2xl border border-border/70 bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={pro.name ?? ""} url={pro.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-bold text-foreground">
                        {i === 0 && <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />}
                        <span className="truncate">{pro.name}</span>
                        {pro.verified_at && <VerifiedBadge />}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {pro.headline || pro.profession}
                      </p>
                    </div>
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-black text-primary-foreground"
                      style={{
                        background: `conic-gradient(var(--primary) ${score * 3.6}deg, color-mix(in srgb, var(--primary) 18%, transparent) 0)`,
                      }}
                      aria-label={`${score}%`}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-card text-[11px] text-foreground">
                        {score}%
                      </span>
                    </span>
                  </div>
                  {!!reasons.length && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {reasons.map((r, k) => (
                        <li
                          key={k}
                          className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-xs"
                        >
                          {reasonText(r, pro.consultation_price_cents)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/profissionais/$professionalId"
                    params={{ professionalId: pro.id! }}
                    onClick={onPicked}
                    className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    {tr([
                      "Ver perfil e horários",
                      "See profile and times",
                      "Ver perfil y horarios",
                      "Voir le profil et les horaires",
                    ])}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            {tr([
              "A nota compara as suas respostas com o que cada profissional informou no perfil. Suas respostas não são salvas.",
              "The score compares your answers with what each professional shared in their profile. Your answers aren't saved.",
              "La nota compara tus respuestas con lo que cada profesional informó en su perfil. Tus respuestas no se guardan.",
              "Le score compare vos réponses au profil de chaque professionnel. Vos réponses ne sont pas enregistrées.",
            ])}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={
              step >= STEPS
                ? () => {
                    setStep(0);
                    setAnswers({ uf: null });
                  }
                : back
            }
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            {step >= STEPS ? (
              <RotateCcw className="h-3.5 w-3.5" />
            ) : (
              <ArrowLeft className="h-3.5 w-3.5" />
            )}
            {step >= STEPS
              ? tr(["Refazer", "Start over", "Rehacer", "Recommencer"])
              : tr(["Voltar", "Back", "Volver", "Retour"])}
          </button>
        ) : (
          <span />
        )}
        {step === 3 && (
          <button
            type="button"
            onClick={() => choose("uf", null)}
            className="cursor-pointer text-xs font-bold text-primary hover:underline"
          >
            {tr([
              "Prefiro não dizer",
              "Rather not say",
              "Prefiero no decir",
              "Je préfère ne pas dire",
            ])}
          </button>
        )}
      </div>
    </div>
  );
}
