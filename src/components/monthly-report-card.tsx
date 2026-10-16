// Cartão do relatório "Minha evolução": escolhe o mês, mostra um resumo rápido e baixa o PDF
// (lib/monthly-report). Fica na Evolução do acompanhamento e na página Funções.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Droplets, FileDown, ListChecks, Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { useAdultTrailProgress } from "@/components/rail-cards";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useNoNumbers } from "@/lib/no-numbers";
import {
  collectMonthlyReport,
  exportMonthlyReportPdf,
  hasAnyData,
  monthLabel,
  recentMonths,
} from "@/lib/monthly-report";

export function MonthlyReportCard({ className = "" }: { className?: string }) {
  const tr = useTr();
  const { user } = useAuth();
  const { locale } = useI18n();
  const noNumbers = useNoNumbers();
  const trail = useAdultTrailProgress(user?.id);
  const months = recentMonths(6);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const month = months[index];

  const report = useQuery({
    queryKey: ["monthly-report", user?.id, month.year, month.month],
    queryFn: () => collectMonthlyReport(user!.id, month, trail),
    enabled: !!user,
  });

  if (!user) return null;
  const data = report.data;
  const empty = data ? !hasAnyData(data) : false;

  const download = async () => {
    setBusy(true);
    try {
      // Dados frescos na hora de gerar (inclui a trilha deste aparelho).
      const fresh = await collectMonthlyReport(user.id, month, trail);
      await exportMonthlyReportPdf(fresh, { name: user.name, locale, noNumbers });
      toast.success(
        tr([
          "Relatório baixado.",
          "Report downloaded.",
          "Informe descargado.",
          "Rapport téléchargé.",
        ]),
      );
    } catch {
      toast.error(
        tr([
          "Não foi possível gerar o relatório agora. Tente de novo.",
          "Couldn't generate the report right now. Please try again.",
          "No se pudo generar el informe ahora. Inténtalo de nuevo.",
          "Impossible de générer le rapport pour le moment. Réessayez.",
        ]),
      );
    } finally {
      setBusy(false);
    }
  };

  const chips = data
    ? [
        {
          icon: Droplets,
          text: `${data.water.daysLogged}`,
          label: tr(["dias com água", "water days", "días con agua", "jours d'eau"]),
        },
        {
          icon: ListChecks,
          text: `${data.habitDays}`,
          label: tr(["dias de hábitos", "habit days", "días de hábitos", "jours d'habitudes"]),
        },
        {
          icon: NotebookPen,
          text: `${data.diary.entries}`,
          label: tr(["no diário", "diary entries", "en el diario", "au journal"]),
        },
        {
          icon: CalendarCheck,
          text: `${data.appointments}`,
          label: tr(["consultas", "consultations", "consultas", "consultations"]),
        },
      ]
    : [];

  return (
    <section
      className={`rounded-3xl border border-border/70 bg-gradient-to-br from-primary-soft/60 via-card to-accent-soft/40 p-4 shadow-xs sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <FileDown className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-tight text-foreground">
            {tr(["Relatório do mês", "Monthly report", "Informe del mes", "Rapport du mois"])}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tr([
              "Seu mês em PDF: água, hábitos, como se sentiu, metas, diário e trilha. Bom para guardar ou levar à consulta.",
              "Your month as a PDF: water, habits, feelings, goals, diary and trail. Great to keep or bring to your appointment.",
              "Tu mes en PDF: agua, hábitos, cómo te sentiste, metas, diario y ruta. Ideal para guardar o llevar a la consulta.",
              "Votre mois en PDF : eau, habitudes, ressentis, objectifs, journal et parcours. Idéal à garder ou à apporter en consultation.",
            ])}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="monthly-report-month">
          {tr(["Mês", "Month", "Mes", "Mois"])}
        </label>
        <select
          id="monthly-report-month"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="h-10 min-w-0 flex-1 cursor-pointer rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground sm:flex-none"
        >
          {months.map((m, i) => (
            <option key={`${m.year}-${m.month}`} value={i}>
              {monthLabel(m, locale)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={download}
          disabled={busy || report.isLoading}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {tr(["Baixar PDF", "Download PDF", "Descargar PDF", "Télécharger le PDF"])}
        </button>
      </div>

      {report.isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {tr([
            "Juntando o seu mês...",
            "Gathering your month...",
            "Reuniendo tu mes...",
            "Préparation de votre mois...",
          ])}
        </p>
      ) : empty ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {tr([
            "Ainda não há registros neste mês. O PDF sai com as seções vazias.",
            "No entries this month yet. The PDF will have empty sections.",
            "Todavía no hay registros este mes. El PDF saldrá con secciones vacías.",
            "Pas encore de données ce mois-ci. Le PDF aura des sections vides.",
          ])}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {chips.map(({ icon: Icon, text, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-2xl bg-card/80 px-3 py-2 shadow-xs"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-black leading-none text-foreground">
                  {text}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">{label}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
