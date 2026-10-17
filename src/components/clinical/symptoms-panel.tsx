// X1 — Aba Sintomas do Diário: anotar o que sentiu, ver as relações possíveis com o que comeu
// nas 24 h antes e montar um resumo para levar à consulta. O profissional vê só a leitura.
import { useMemo, useState } from "react";
import {
  BatteryLow,
  Brain,
  ClipboardCopy,
  Droplets,
  Expand,
  Flame,
  Hand,
  Hourglass,
  Lightbulb,
  Moon,
  PenLine,
  Share2,
  Trash2,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/clinical/ui";
import { useTr } from "@/components/settings-ui";
import { useClinicalI18n } from "@/lib/clinical/i18n";
import { formatDate, formatTime } from "@/lib/clinical/format";
import { useDiary } from "@/lib/clinical/queries";
import {
  FOOD_GROUPS,
  INTENSITY_NAMES,
  SYMPTOMS,
  SYMPTOM_BY_ID,
  findRelations,
  useAddSymptom,
  useDeleteSymptom,
  useSymptoms,
  type Relation,
  type SymptomId,
  type SymptomLog,
} from "@/lib/clinical/symptoms";
import { canShare, shareContent } from "@/lib/native";
import { cn } from "@/lib/utils";
import type { Names } from "@/lib/appearance-data";

const SYMPTOM_ICON: Record<SymptomId, LucideIcon> = {
  estufamento: Expand,
  gases: Wind,
  azia: Flame,
  dor_barriga: Zap,
  enjoo: Waves,
  diarreia: Droplets,
  intestino_preso: Hourglass,
  dor_cabeca: Brain,
  cansaco: BatteryLow,
  pele: Hand,
  sono_ruim: Moon,
  outro: PenLine,
};

function SymptomIcon({ id, className }: { id: SymptomId; className?: string }) {
  const Icon = SYMPTOM_ICON[id] ?? PenLine;
  return <Icon className={cn("text-primary", className)} />;
}

const GROUP_NAME = Object.fromEntries(FOOD_GROUPS.map((g) => [g.id, g.names]));

/** "agora", "há 1 h", "há 3 h" ou um horário escolhido. */
const WHEN = [0, 1, 3, 6] as const;

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SymptomsPanel({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
  const logs = useSymptoms(patientId, 60);
  const diary = useDiary(patientId);
  const list = useMemo(() => logs.data ?? [], [logs.data]);
  const relations = useMemo(() => findRelations(diary.data ?? [], list), [diary.data, list]);

  return (
    <div className="space-y-5">
      {canEdit && <SymptomComposer patientId={patientId} />}
      <RelationsCard relations={relations} logs={list} mealCount={diary.data?.length ?? 0} />
      <SummaryCard logs={list} relations={relations} />
      <RecentList logs={list} canEdit={canEdit} />
    </div>
  );
}

function SymptomComposer({ patientId }: { patientId: string }) {
  const tr = useTr();
  const [symptom, setSymptom] = useState<SymptomId | null>(null);
  const [intensity, setIntensity] = useState(2);
  const [hoursAgo, setHoursAgo] = useState<number | "outro">(0);
  const [custom, setCustom] = useState(() => toLocalInput(new Date()));
  const [note, setNote] = useState("");
  const add = useAddSymptom();

  const save = () => {
    if (!symptom) return;
    const felt =
      hoursAgo === "outro" ? new Date(custom) : new Date(Date.now() - hoursAgo * 3_600_000);
    if (Number.isNaN(felt.getTime()) || felt.getTime() > Date.now() + 60_000) {
      toast.error(
        tr([
          "Escolha um horário que já passou.",
          "Pick a time in the past.",
          "Elige una hora que ya pasó.",
          "Choisissez une heure passée.",
        ]),
      );
      return;
    }
    add.mutate(
      { patientId, symptom, intensity, feltAt: felt.toISOString(), note },
      {
        onSuccess: () => {
          toast.success(tr(["Anotado.", "Saved.", "Anotado.", "Noté."]));
          setSymptom(null);
          setNote("");
          setHoursAgo(0);
          setIntensity(2);
        },
        onError: () =>
          toast.error(
            tr([
              "Não foi possível salvar.",
              "Could not save.",
              "No se pudo guardar.",
              "Impossible d'enregistrer.",
            ]),
          ),
      },
    );
  };

  return (
    <Card>
      <h2 className="font-display text-lg font-bold text-foreground">
        {tr([
          "O que você sentiu?",
          "What did you feel?",
          "¿Qué sentiste?",
          "Qu'avez-vous ressenti ?",
        ])}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {tr([
          "Anote na hora ou logo depois. Com o diário de refeições junto, aparecem as relações possíveis.",
          "Write it down right away or soon after. Together with your meal diary, possible links show up.",
          "Anótalo en el momento o poco después. Junto con el diario de comidas, aparecen relaciones posibles.",
          "Notez-le sur le moment ou peu après. Avec le journal des repas, des liens possibles apparaissent.",
        ])}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="group">
        {SYMPTOMS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={symptom === s.id}
            onClick={() => setSymptom(symptom === s.id ? null : s.id)}
            className={cn(
              "nc-rise flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center text-[11px] font-semibold leading-tight transition active:scale-95",
              symptom === s.id
                ? "border-primary bg-primary/10 text-foreground shadow-sm"
                : "border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            style={{ animationDelay: `${i * 25}ms` }}
          >
            <SymptomIcon id={s.id} className="h-6 w-6" />
            {tr(s.names)}
          </button>
        ))}
      </div>

      {symptom && (
        <div className="nc-rise mt-4 space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">
              {tr(["Intensidade", "Intensity", "Intensidad", "Intensité"])}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITY_NAMES.map((n, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={intensity === i + 1}
                  onClick={() => setIntensity(i + 1)}
                  className={cn(
                    "min-h-11 rounded-xl border text-sm font-semibold transition",
                    intensity === i + 1
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {"●".repeat(i + 1)} {tr(n)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">
              {tr(["Quando", "When", "Cuándo", "Quand"])}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {WHEN.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={hoursAgo === h}
                  onClick={() => setHoursAgo(h)}
                  className={cn(
                    "min-h-11 rounded-xl border px-1 text-xs font-semibold transition",
                    hoursAgo === h
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {h === 0
                    ? tr(["Agora", "Now", "Ahora", "Maintenant"])
                    : tr([`Há ${h} h`, `${h} h ago`, `Hace ${h} h`, `Il y a ${h} h`])}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={hoursAgo === "outro"}
                onClick={() => setHoursAgo("outro")}
                className={cn(
                  "min-h-11 rounded-xl border px-1 text-xs font-semibold transition",
                  hoursAgo === "outro"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {tr(["Outro", "Other", "Otro", "Autre"])}
              </button>
            </div>
            {hoursAgo === "outro" && (
              <input
                type="datetime-local"
                value={custom}
                max={toLocalInput(new Date())}
                onChange={(e) => setCustom(e.target.value)}
                className={cn(inputClass, "mt-2")}
                aria-label={tr(["Data e hora", "Date and time", "Fecha y hora", "Date et heure"])}
              />
            )}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground">
              {tr(["Nota (opcional)", "Note (optional)", "Nota (opcional)", "Note (facultatif)"])}
            </span>
            <input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              placeholder={tr([
                "Ex.: depois do almoço na rua",
                "E.g. after eating out at lunch",
                "Ej.: después de almorzar fuera",
                "Ex. : après un déjeuner dehors",
              ])}
            />
          </label>
          <button
            type="button"
            className={cn(buttonPrimary, "w-full justify-center")}
            disabled={add.isPending}
            onClick={save}
          >
            {tr(["Anotar", "Save", "Anotar", "Noter"])}
          </button>
        </div>
      )}
    </Card>
  );
}

function relationText(r: Relation, tr: (n: Names) => string) {
  const s = tr(SYMPTOM_BY_ID[r.symptom].names).toLowerCase();
  const g = tr(GROUP_NAME[r.group]).toLowerCase();
  const base = Math.round(r.baseShare * 100);
  return tr([
    `Em ${r.withGroup} de ${r.events} vezes que teve ${s}, você tinha comido ${g} nas 24 h antes. Nos dias com diário, ${g} aparece em ${base}% deles.`,
    `In ${r.withGroup} of ${r.events} times you had ${s}, you had eaten ${g} in the 24 h before. On diary days, it shows up on ${base}% of them.`,
    `En ${r.withGroup} de ${r.events} veces que tuviste ${s}, habías comido ${g} en las 24 h anteriores. En los días con diario, aparece en el ${base}%.`,
    `${r.withGroup} fois sur ${r.events} où vous avez eu ${s}, vous aviez mangé ${g} dans les 24 h avant. Les jours avec journal, cela apparaît ${base} % du temps.`,
  ]);
}

function RelationsCard({
  relations,
  logs,
  mealCount,
}: {
  relations: Relation[];
  logs: SymptomLog[];
  mealCount: number;
}) {
  const tr = useTr();
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        {tr(["Relações possíveis", "Possible links", "Relaciones posibles", "Liens possibles"])}
      </h2>
      {relations.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {logs.length < 3 || mealCount < 7
            ? tr([
                "Anote pelo menos 3 vezes cada sintoma e 1 semana de refeições no diário para as relações aparecerem.",
                "Log each symptom at least 3 times and one week of meals in the diary for links to show up.",
                "Anota al menos 3 veces cada síntoma y 1 semana de comidas en el diario para que aparezcan relaciones.",
                "Notez chaque symptôme au moins 3 fois et une semaine de repas pour voir apparaître des liens.",
              ])
            : tr([
                "Nenhum alimento se destacou antes dos sintomas até agora. Continue anotando.",
                "No food stands out before your symptoms so far. Keep logging.",
                "Ningún alimento destaca antes de los síntomas por ahora. Sigue anotando.",
                "Aucun aliment ne ressort avant les symptômes pour l'instant. Continuez à noter.",
              ])}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {relations.slice(0, 6).map((r, i) => (
            <li
              key={`${r.symptom}-${r.group}`}
              className="nc-rise flex gap-3 rounded-2xl bg-amber-500/10 p-3 text-sm text-foreground"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <SymptomIcon id={r.symptom} className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{relationText(r, tr)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {tr([
          "Isto é só uma pista para conversar na consulta: pode ser coincidência. Não corte alimentos por conta própria.",
          "This is only a clue to talk about at your appointment: it may be a coincidence. Don't cut foods on your own.",
          "Es solo una pista para hablar en la consulta: puede ser coincidencia. No elimines alimentos por tu cuenta.",
          "Ce n'est qu'une piste à évoquer en consultation : cela peut être une coïncidence. N'arrêtez pas d'aliments seul.",
        ])}
      </p>
    </Card>
  );
}

function SummaryCard({ logs, relations }: { logs: SymptomLog[]; relations: Relation[] }) {
  const tr = useTr();
  const counts = useMemo(() => {
    const m = new Map<SymptomId, { n: number; strong: number }>();
    for (const l of logs) {
      const c = m.get(l.symptom) ?? { n: 0, strong: 0 };
      c.n++;
      if (l.intensity === 3) c.strong++;
      m.set(l.symptom, c);
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [logs]);
  if (!logs.length) return null;

  const text = [
    tr([
      "Resumo dos sintomas (últimos 60 dias) — NutriConnect",
      "Symptom summary (last 60 days) — NutriConnect",
      "Resumen de síntomas (últimos 60 días) — NutriConnect",
      "Résumé des symptômes (60 derniers jours) — NutriConnect",
    ]),
    "",
    ...counts.map(
      ([id, c]) =>
        `• ${tr(SYMPTOM_BY_ID[id].names)}: ${c.n}×` +
        (c.strong ? ` (${c.strong} ${tr(["fortes", "strong", "fuertes", "forts"])})` : ""),
    ),
    ...(relations.length
      ? [
          "",
          tr([
            "Relações possíveis:",
            "Possible links:",
            "Relaciones posibles:",
            "Liens possibles :",
          ]),
          ...relations.slice(0, 6).map((r) => `• ${relationText(r, tr)}`),
        ]
      : []),
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        tr(["Resumo copiado.", "Summary copied.", "Resumen copiado.", "Résumé copié."]),
      );
    } catch {
      toast.error(
        tr([
          "Não foi possível copiar.",
          "Could not copy.",
          "No se pudo copiar.",
          "Impossible de copier.",
        ]),
      );
    }
  };

  return (
    <Card>
      <h2 className="font-display text-lg font-bold text-foreground">
        {tr([
          "Para levar à consulta",
          "To take to your appointment",
          "Para llevar a la consulta",
          "Pour la consultation",
        ])}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.slice(0, 4).map(([id, c]) => (
          <div
            key={id}
            className="rounded-2xl border border-border/70 bg-secondary/30 p-3 text-center"
          >
            <SymptomIcon id={id} className="mx-auto h-6 w-6" />
            <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{c.n}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {tr(SYMPTOM_BY_ID[id].names)}
            </p>
          </div>
        ))}
      </div>
      <div className={cn("mt-4 grid gap-2", canShare() && "grid-cols-2")}>
        <button type="button" className={cn(buttonSecondary, "justify-center")} onClick={copy}>
          <ClipboardCopy className="h-4 w-4" />
          {tr(["Copiar resumo", "Copy summary", "Copiar resumen", "Copier"])}
        </button>
        {canShare() && (
          <button
            type="button"
            className={cn(buttonSecondary, "justify-center")}
            onClick={() => void shareContent({ title: "NutriConnect", text })}
          >
            <Share2 className="h-4 w-4" />
            {tr(["Compartilhar", "Share", "Compartir", "Partager"])}
          </button>
        )}
      </div>
    </Card>
  );
}

function RecentList({ logs, canEdit }: { logs: SymptomLog[]; canEdit: boolean }) {
  const tr = useTr();
  const { locale } = useClinicalI18n();
  const remove = useDeleteSymptom();
  const [all, setAll] = useState(false);
  if (!logs.length) return null;
  const shown = all ? logs : logs.slice(0, 8);
  return (
    <Card>
      <h2 className="font-display text-lg font-bold text-foreground">
        {tr(["Anotações", "Entries", "Anotaciones", "Notes"])}
      </h2>
      <ul className="mt-3 divide-y divide-border/60">
        {shown.map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-2.5">
            <SymptomIcon id={l.symptom} className="h-6 w-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {tr(SYMPTOM_BY_ID[l.symptom]?.names ?? ["", "", "", ""])}{" "}
                <span className="font-normal text-muted-foreground">
                  · {tr(INTENSITY_NAMES[l.intensity - 1])}
                </span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {formatDate(l.felt_at, locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {formatTime(l.felt_at, locale)}
                {l.note && ` · ${l.note}`}
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                className={cn(buttonGhost, "h-11 w-11 justify-center p-0")}
                aria-label={tr(["Apagar", "Delete", "Eliminar", "Supprimer"])}
                onClick={() => remove.mutate(l.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {logs.length > 8 && !all && (
        <button
          type="button"
          className={cn(buttonGhost, "mt-2 w-full justify-center")}
          onClick={() => setAll(true)}
        >
          {tr(["Ver todas", "See all", "Ver todas", "Tout voir"])}
        </button>
      )}
    </Card>
  );
}
