// "Pergunte à nutri" (M8) na página da comunidade: próximos eventos ao vivo e, para o profissional
// que administra a comunidade, o formulário para marcar um.
import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarPlus, Mic, Radio } from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import type { Names } from "@/lib/appearance-data";
import {
  phaseOf,
  useCommunityEvents,
  useCreateEvent,
  type CommunityEvent,
  type EventPhase,
} from "@/lib/community-events";
import { cn } from "@/lib/utils";

const card = "rounded-3xl border border-border bg-card p-5 shadow-card";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const btnSoft =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";
const field =
  "w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground";

export const PHASE_NAMES: Record<EventPhase, Names> = {
  agendado: ["Marcado", "Scheduled", "Programado", "Prévu"],
  ao_vivo: ["Ao vivo agora", "Live now", "En vivo ahora", "En direct"],
  encerrado: ["Encerrado", "Ended", "Terminado", "Terminé"],
  cancelado: ["Cancelado", "Canceled", "Cancelado", "Annulé"],
};

export function PhaseBadge({ event }: { event: CommunityEvent }) {
  const tr = useTr();
  const phase = phaseOf(event);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        phase === "ao_vivo"
          ? "bg-destructive text-white"
          : phase === "agendado"
            ? "bg-accent-soft text-foreground"
            : "bg-secondary text-muted-foreground",
      )}
    >
      {phase === "ao_vivo" && <Radio className="h-3 w-3 animate-pulse" />}
      {tr(PHASE_NAMES[phase])}
    </span>
  );
}

export function useEventDate() {
  const { locale } = useI18n();
  return (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
}

export function CommunityEvents({ communityId, isHost }: { communityId: string; isHost: boolean }) {
  const tr = useTr();
  const events = useCommunityEvents(communityId);
  const when = useEventDate();
  const [creating, setCreating] = useState(false);

  // Sem a tabela no banco (migration pendente), a seção não aparece.
  if (events.isError) return null;
  const list = (events.data ?? []).filter((e) => {
    const phase = phaseOf(e);
    return phase === "agendado" || phase === "ao_vivo" || (phase === "encerrado" && isHost);
  });
  if (!isHost && list.length === 0) return null;

  return (
    <section className={cn(card, "mt-6")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Mic className="h-4 w-4 text-accent" />
          {tr([
            "Pergunte à nutri",
            "Ask the dietitian",
            "Pregunta a la nutri",
            "Demandez à la diét",
          ])}
        </h2>
        {isHost && !creating && (
          <button type="button" className={btnSoft} onClick={() => setCreating(true)}>
            <CalendarPlus className="h-3.5 w-3.5" />
            {tr(["Marcar evento", "Schedule event", "Programar evento", "Programmer"])}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {tr([
          "Eventos ao vivo: mande sua pergunta antes, vote nas que você também quer saber e acompanhe as respostas.",
          "Live events: send your question ahead, upvote the ones you also want answered and follow the answers.",
          "Eventos en vivo: envía tu pregunta antes, vota las que también quieres saber y sigue las respuestas.",
          "Événements en direct : posez votre question à l'avance, votez pour celles qui vous intéressent et suivez les réponses.",
        ])}
      </p>

      {creating && <CreateEvent communityId={communityId} onDone={() => setCreating(false)} />}

      {list.length > 0 && (
        <ul className="mt-4 space-y-2">
          {list.map((e) => (
            <li key={e.id}>
              <Link
                to="/evento/$eventId"
                params={{ eventId: e.id }}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 p-3 transition hover:bg-secondary/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{when(e.starts_at)}</p>
                </div>
                <PhaseBadge event={e} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Data e hora local para o campo datetime-local (padrão: amanhã às 19h). */
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

function CreateEvent({ communityId, onDone }: { communityId: string; onDone: () => void }) {
  const tr = useTr();
  const create = useCreateEvent();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [duration, setDuration] = useState(60);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        communityId,
        title: title.trim(),
        description: description.trim(),
        startsAt: new Date(start).toISOString(),
        duration,
      },
      {
        onSuccess: () => {
          toast.success(
            tr([
              "Evento marcado! Os membros foram avisados.",
              "Event scheduled! Members were notified.",
              "¡Evento programado! Se avisó a los miembros.",
              "Événement programmé ! Les membres sont prévenus.",
            ]),
          );
          onDone();
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-3 rounded-2xl border border-accent/40 bg-accent-soft/20 p-4"
    >
      <input
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={tr([
          "Tema (ex.: Lanches para levar ao trabalho)",
          "Topic (e.g. Snacks to take to work)",
          "Tema (ej.: Meriendas para el trabajo)",
          "Sujet (ex. : En-cas pour le travail)",
        ])}
        className={field}
      />
      <textarea
        value={description}
        maxLength={1000}
        rows={3}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={tr([
          "Sobre o que vai ser a conversa (opcional)",
          "What the conversation is about (optional)",
          "De qué tratará la charla (opcional)",
          "De quoi on va parler (facultatif)",
        ])}
        className={field}
      />
      <div className="flex flex-wrap gap-3">
        <label className="text-xs font-semibold text-muted-foreground">
          {tr(["Começa", "Starts", "Empieza", "Début"])}
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={cn(field, "mt-1")}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          {tr(["Duração", "Duration", "Duración", "Durée"])}
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={cn(field, "mt-1")}
          >
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className={btnPrimary}
          disabled={title.trim().length < 3 || !start || create.isPending}
        >
          {tr([
            "Marcar e avisar os membros",
            "Schedule and notify",
            "Programar y avisar",
            "Programmer et prévenir",
          ])}
        </button>
        <button type="button" className={btnSoft} onClick={onDone}>
          {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
        </button>
      </div>
    </form>
  );
}
