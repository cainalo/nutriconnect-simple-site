// X2 — Próximos exames: o paciente anota os seus; o profissional do acompanhamento pede (e o
// paciente é avisado). O lembrete chega 24 h antes, no site e por push.
import { useState } from "react";
import { BellRing, CalendarClock, Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  useDeleteExam,
  useExams,
  useSaveExam,
  useToggleExamDone,
  type ExamReminder,
} from "@/lib/clinical/reminders";
import { cn } from "@/lib/utils";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ExamsCard({
  patientId,
  meId,
  asProfessional,
  canEdit,
}: {
  patientId: string;
  meId: string;
  /** Profissional do acompanhamento: o exame entra como pedido dele. */
  asProfessional: boolean;
  canEdit: boolean;
}) {
  const tr = useTr();
  const exams = useExams(patientId);
  const [editing, setEditing] = useState<ExamReminder | "novo" | null>(null);
  const [showDone, setShowDone] = useState(false);
  const list = exams.data ?? [];
  const pending = list.filter((e) => !e.done_at);
  const done = list.filter((e) => e.done_at).reverse();

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <CalendarClock className="h-5 w-5 text-primary" />
            {tr(["Próximos exames", "Upcoming tests", "Próximos exámenes", "Prochains examens"])}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {asProfessional
              ? tr([
                  "Peça um exame com data: o paciente é avisado agora e 24 h antes.",
                  "Request a test with a date: the patient is notified now and 24 h before.",
                  "Pide un examen con fecha: el paciente recibe aviso ahora y 24 h antes.",
                  "Demandez un examen daté : le patient est prévenu maintenant et 24 h avant.",
                ])
              : tr([
                  "Anote a data do exame e receba um lembrete 24 h antes.",
                  "Add the test date and get a reminder 24 h before.",
                  "Anota la fecha del examen y recibe un aviso 24 h antes.",
                  "Notez la date de l'examen et recevez un rappel 24 h avant.",
                ])}
          </p>
        </div>
        {canEdit && editing === null && (
          <button
            type="button"
            className={cn(buttonSecondary, "whitespace-nowrap")}
            onClick={() => setEditing("novo")}
          >
            <Plus className="h-4 w-4" />
            {asProfessional
              ? tr(["Pedir exame", "Request test", "Pedir examen", "Demander"])
              : tr(["Anotar exame", "Add test", "Anotar examen", "Ajouter"])}
          </button>
        )}
      </div>

      {editing !== null && (
        <ExamForm
          exam={editing === "novo" ? undefined : editing}
          patientId={patientId}
          requestedBy={asProfessional ? meId : null}
          onClose={() => setEditing(null)}
        />
      )}

      {pending.length === 0 && editing === null ? (
        <p className="mt-4 rounded-2xl bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
          {tr([
            "Nenhum exame marcado.",
            "No tests scheduled.",
            "Ningún examen programado.",
            "Aucun examen prévu.",
          ])}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {pending.map((e, i) => (
            <ExamRow
              key={e.id}
              exam={e}
              index={i}
              meId={meId}
              canEdit={canEdit}
              onEdit={() => setEditing(e)}
            />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <button
            type="button"
            className={cn(buttonGhost, "w-full justify-center")}
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
          >
            {showDone
              ? tr(["Esconder os feitos", "Hide done", "Ocultar hechos", "Masquer les faits"])
              : tr([
                  `Feitos (${done.length})`,
                  `Done (${done.length})`,
                  `Hechos (${done.length})`,
                  `Faits (${done.length})`,
                ])}
          </button>
          {showDone && (
            <ul className="mt-2 space-y-2">
              {done.map((e, i) => (
                <ExamRow
                  key={e.id}
                  exam={e}
                  index={i}
                  meId={meId}
                  canEdit={canEdit}
                  onEdit={() => setEditing(e)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function ExamRow({
  exam,
  index,
  meId,
  canEdit,
  onEdit,
}: {
  exam: ExamReminder;
  index: number;
  meId: string;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const tr = useTr();
  const { locale } = useClinicalI18n();
  const toggle = useToggleExamDone();
  const remove = useDeleteExam();
  const due = new Date(exam.due_at);
  const soon =
    !exam.done_at && due.getTime() - Date.now() < 48 * 3_600_000 && due.getTime() > Date.now();
  const late = !exam.done_at && due.getTime() < Date.now();
  // O paciente mexe em tudo; o profissional só no que ele pediu.
  const mine = exam.patient_id === meId || exam.requested_by === meId;

  return (
    <li
      className={cn(
        "nc-rise flex items-start gap-3 rounded-2xl border p-3",
        exam.done_at
          ? "border-border/50 opacity-70"
          : soon
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-border/70",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        type="button"
        disabled={!canEdit || !mine || toggle.isPending}
        onClick={() => toggle.mutate({ id: exam.id, done: !exam.done_at })}
        aria-pressed={!!exam.done_at}
        aria-label={tr([
          "Marcar como feito",
          "Mark as done",
          "Marcar como hecho",
          "Marquer comme fait",
        ])}
        className={cn(
          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition",
          exam.done_at
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary",
        )}
      >
        {exam.done_at && <Check className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold text-foreground", exam.done_at && "line-through")}>
          {exam.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span
            className={cn(
              late && "font-semibold text-destructive",
              soon && "font-semibold text-amber-600",
            )}
          >
            {formatDate(due, locale, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
            {formatTime(due, locale)}
          </span>
          {exam.location && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {exam.location}
            </span>
          )}
          {exam.requested_by && exam.requested_by !== exam.patient_id && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {tr([
                "Pedido do profissional",
                "Requested by your professional",
                "Pedido del profesional",
                "Demandé par le professionnel",
              ])}
            </span>
          )}
          {exam.reminded_at && !exam.done_at && (
            <span className="inline-flex items-center gap-0.5">
              <BellRing className="h-3 w-3" /> {tr(["avisado", "reminded", "avisado", "rappelé"])}
            </span>
          )}
        </p>
        {exam.notes && <p className="mt-1 text-xs text-foreground">{exam.notes}</p>}
      </div>
      {canEdit && mine && !exam.done_at && (
        <div className="flex shrink-0">
          <button
            type="button"
            className={cn(buttonGhost, "h-11 w-11 justify-center p-0")}
            aria-label={tr(["Editar", "Edit", "Editar", "Modifier"])}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(buttonGhost, "h-11 w-11 justify-center p-0")}
            aria-label={tr(["Apagar", "Delete", "Eliminar", "Supprimer"])}
            onClick={() => remove.mutate(exam.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}

function ExamForm({
  exam,
  patientId,
  requestedBy,
  onClose,
}: {
  exam?: ExamReminder;
  patientId: string;
  requestedBy: string | null;
  onClose: () => void;
}) {
  const tr = useTr();
  const save = useSaveExam();
  const [title, setTitle] = useState(exam?.title ?? "");
  const [due, setDue] = useState(() =>
    toLocalInput(exam ? new Date(exam.due_at) : new Date(Date.now() + 7 * 86_400_000)),
  );
  const [location, setLocation] = useState(exam?.location ?? "");
  const [notes, setNotes] = useState(exam?.notes ?? "");

  const submit = () => {
    const when = new Date(due);
    if (title.trim().length < 2 || Number.isNaN(when.getTime())) {
      toast.error(
        tr([
          "Escreva o nome do exame e a data.",
          "Enter the test name and date.",
          "Escribe el nombre del examen y la fecha.",
          "Indiquez le nom de l'examen et la date.",
        ]),
      );
      return;
    }
    save.mutate(
      {
        id: exam?.id,
        patientId,
        requestedBy,
        title,
        dueAt: when.toISOString(),
        location,
        notes,
      },
      {
        onSuccess: () => {
          toast.success(
            tr(["Exame salvo.", "Test saved.", "Examen guardado.", "Examen enregistré."]),
          );
          onClose();
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
    <div className="nc-rise mt-4 space-y-3 rounded-2xl bg-secondary/40 p-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-foreground">
          {tr(["Exame", "Test", "Examen", "Examen"])}
        </span>
        <input
          autoFocus
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder={tr([
            "Ex.: hemograma, glicemia em jejum",
            "E.g. blood count, fasting glucose",
            "Ej.: hemograma, glucosa en ayunas",
            "Ex. : NFS, glycémie à jeun",
          ])}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-foreground">
            {tr(["Data e hora", "Date and time", "Fecha y hora", "Date et heure"])}
          </span>
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-foreground">
            {tr(["Local (opcional)", "Place (optional)", "Lugar (opcional)", "Lieu (facultatif)"])}
          </span>
          <input
            value={location}
            maxLength={160}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-foreground">
          {tr([
            "Orientações (opcional)",
            "Instructions (optional)",
            "Indicaciones (opcional)",
            "Consignes (facultatif)",
          ])}
        </span>
        <input
          value={notes}
          maxLength={400}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
          placeholder={tr([
            "Ex.: jejum de 8 horas",
            "E.g. fast for 8 hours",
            "Ej.: ayuno de 8 horas",
            "Ex. : à jeun depuis 8 heures",
          ])}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={cn(buttonGhost, "justify-center")} onClick={onClose}>
          {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
        </button>
        <button
          type="button"
          className={cn(buttonPrimary, "justify-center")}
          disabled={save.isPending}
          onClick={submit}
        >
          {tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
        </button>
      </div>
    </div>
  );
}
