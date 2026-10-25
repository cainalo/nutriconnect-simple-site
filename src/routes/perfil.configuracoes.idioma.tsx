import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";
import { useI18n } from "@/hooks/use-i18n";
import { LOCALES } from "@/lib/i18n";
import { TIME_ZONES, applyRegion } from "@/lib/region";
import type { DateFormat, TimeFormat, WeekStart } from "@/lib/appearance";
import { localeMeta } from "@/lib/i18n";
import { SettingsCard, SettingsPage, selectClass, useTr } from "@/components/settings-ui";

export const Route = createFileRoute("/perfil/configuracoes/idioma")({
  head: () => ({ meta: [{ title: "Idioma e região — NutriConnect" }] }),
  component: IdiomaPage,
});

function IdiomaPage() {
  const { locale, setLocale, t } = useI18n();
  const tr = useTr();
  const { appearance: a, update } = useAppearance();

  // Exemplo ao vivo com as escolhas atuais.
  const sample = (() => {
    const now = new Date();
    const [loc, date] = applyRegion(localeMeta(locale).tag, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const [loc2, time] = applyRegion(localeMeta(locale).tag, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${new Intl.DateTimeFormat(loc, date).format(now)} · ${new Intl.DateTimeFormat(loc2, time).format(now)}`;
  })();

  const dateOptions: { id: DateFormat; label: string }[] = [
    {
      id: "auto",
      label: tr([
        "Automático (do idioma)",
        "Automatic (from language)",
        "Automático (del idioma)",
        "Automatique (selon la langue)",
      ]),
    },
    {
      id: "dmy",
      label: tr([
        "Dia/mês/ano (31/12/2026)",
        "Day/month/year (31/12/2026)",
        "Día/mes/año (31/12/2026)",
        "Jour/mois/année (31/12/2026)",
      ]),
    },
    {
      id: "mdy",
      label: tr([
        "Mês/dia/ano (12/31/2026)",
        "Month/day/year (12/31/2026)",
        "Mes/día/año (12/31/2026)",
        "Mois/jour/année (12/31/2026)",
      ]),
    },
    {
      id: "ymd",
      label: tr([
        "Ano-mês-dia (2026-12-31)",
        "Year-month-day (2026-12-31)",
        "Año-mes-día (2026-12-31)",
        "Année-mois-jour (2026-12-31)",
      ]),
    },
    {
      id: "long",
      label: tr([
        "Mês por extenso (31 de dezembro)",
        "Month spelled out (31 December)",
        "Mes con letras (31 de diciembre)",
        "Mois en toutes lettres (31 décembre)",
      ]),
    },
  ];
  const timeOptions: { id: TimeFormat; label: string }[] = [
    { id: "auto", label: tr(["Automático", "Automatic", "Automático", "Automatique"]) },
    {
      id: "24h",
      label: tr(["24 horas (14:30)", "24-hour (14:30)", "24 horas (14:30)", "24 heures (14:30)"]),
    },
    {
      id: "12h",
      label: tr([
        "12 horas (2:30 PM)",
        "12-hour (2:30 PM)",
        "12 horas (2:30 PM)",
        "12 heures (2:30 PM)",
      ]),
    },
  ];

  // Nome de cada idioma no idioma atual (só aparece embaixo quando difere do nome próprio).
  const NAME_HERE: Record<string, [string, string, string, string]> = {
    "pt-BR": [
      "Português (Brasil)",
      "Portuguese (Brazil)",
      "Portugués (Brasil)",
      "Portugais (Brésil)",
    ],
    en: ["Inglês", "English", "Inglés", "Anglais"],
    es: ["Espanhol", "Spanish", "Español", "Espagnol"],
    fr: ["Francês", "French", "Francés", "Français"],
  };
  const weekOptions: { id: WeekStart; label: string }[] = [
    { id: "mon", label: tr(["Segunda-feira", "Monday", "Lunes", "Lundi"]) },
    { id: "sun", label: tr(["Domingo", "Sunday", "Domingo", "Dimanche"]) },
  ];
  const field = (id: string, label: string, control: ReactNode, hint?: string) => (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
      </label>
      {control}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <SettingsPage
      title={tr(["Idioma e região", "Language and region", "Idioma y región", "Langue et région"])}
      hint={t("settings.language.hint")}
    >
      <SettingsCard
        title={tr(["Idioma do site", "Site language", "Idioma del sitio", "Langue du site"])}
      >
        <div className="space-y-2.5">
          {LOCALES.map((l) => {
            const active = l.id === locale;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLocale(l.id);
                  toast.success(l.name + " — " + t("settings.language.changed"));
                }}
                className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-border/70 bg-card hover:bg-secondary/50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-black tracking-wider text-foreground">
                    {l.flag}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-foreground">{l.name}</span>
                    {tr(NAME_HERE[l.id]) !== l.name && (
                      <span className="block text-[11px] text-muted-foreground">
                        {tr(NAME_HERE[l.id])}
                      </span>
                    )}
                  </span>
                </span>
                {active && <Check className="h-5 w-5 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title={tr(["Data e hora", "Date and time", "Fecha y hora", "Date et heure"])}
        hint={tr([
          "Vale para datas e horários mostrados no site. Fica salvo na sua conta.",
          "Applies to dates and times shown across the site. Saved to your account.",
          "Vale para las fechas y horas mostradas en el sitio. Se guarda en tu cuenta.",
          "S'applique aux dates et heures affichées sur le site. Enregistré sur votre compte.",
        ])}
      >
        {/* Rótulo em cima de cada campo e as caixas com a mesma largura */}
        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            "fmt-date",
            tr(["Formato da data", "Date format", "Formato de fecha", "Format de date"]),
            <select
              id="fmt-date"
              value={a.dateFormat}
              onChange={(e) => update({ dateFormat: e.target.value as DateFormat })}
              className={`${selectClass} w-full`}
            >
              {dateOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>,
          )}
          {field(
            "fmt-time",
            tr(["Formato da hora", "Time format", "Formato de hora", "Format de l'heure"]),
            <select
              id="fmt-time"
              value={a.timeFormat}
              onChange={(e) => update({ timeFormat: e.target.value as TimeFormat })}
              className={`${selectClass} w-full`}
            >
              {timeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>,
          )}
          {field(
            "fmt-zone",
            tr(["Fuso horário", "Time zone", "Zona horaria", "Fuseau horaire"]),
            <select
              id="fmt-zone"
              value={a.timeZone}
              onChange={(e) => update({ timeZone: e.target.value })}
              className={`${selectClass} w-full`}
            >
              <option value="auto">
                {tr(["Automático", "Automatic", "Automático", "Automatique"])}
              </option>
              {TIME_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>,
            tr([
              "Automático usa o fuso do seu aparelho.",
              "Automatic uses your device's time zone.",
              "Automático usa la zona horaria de tu dispositivo.",
              "Automatique utilise le fuseau de votre appareil.",
            ]),
          )}
          {field(
            "fmt-week",
            tr([
              "Primeiro dia da semana",
              "First day of the week",
              "Primer día de la semana",
              "Premier jour de la semaine",
            ]),
            <select
              id="fmt-week"
              value={a.weekStart}
              onChange={(e) => update({ weekStart: e.target.value as WeekStart })}
              className={`${selectClass} w-full`}
            >
              {weekOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>,
            tr([
              "Vale para a agenda e o resumo da semana do painel.",
              "Applies to the schedule and the dashboard's week summary.",
              "Vale para la agenda y el resumen semanal del panel.",
              "S'applique à l'agenda et au résumé de la semaine du tableau de bord.",
            ]),
          )}
        </div>
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          {tr(["Exemplo:", "Example:", "Ejemplo:", "Exemple :"])}{" "}
          <span className="font-semibold text-foreground">{sample}</span>
        </p>
      </SettingsCard>
    </SettingsPage>
  );
}
