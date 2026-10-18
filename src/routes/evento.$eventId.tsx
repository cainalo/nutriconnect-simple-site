// Página de um evento ao vivo da comunidade (M8): perguntas com votos e respostas fixadas, em
// tempo real. O profissional responde, fixa, oculta e pode cancelar o evento.
import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronUp,
  EyeOff,
  Eye,
  Flag,
  Loader2,
  MessageCircleReply,
  Pin,
  PinOff,
  Send,
  Trash2,
  XCircle,
  CalendarPlus,
} from "lucide-react";
import { ConfirmAction } from "@/components/confirm-action";
import { AppScreen } from "@/components/app-screen";
import { PhaseBadge, useEventDate } from "@/components/community-events";
import { useTr } from "@/components/settings-ui";
import { AuthGateLoading } from "@/components/site-chrome";
import { useRequireAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/community";
import {
  QUESTION_MAX,
  QUESTION_MIN,
  phaseOf,
  useAnswerQuestion,
  useAskQuestion,
  useCancelEvent,
  useCommunityEvent,
  useDeleteQuestion,
  useEventQuestions,
  useEventRealtime,
  useFlagQuestion,
  useModerateQuestion,
  useVoteQuestion,
  type EventQuestion,
} from "@/lib/community-events";
import { cardsByIds, type PersonCard } from "@/lib/social/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/evento/$eventId")({
  head: () => ({ meta: [{ title: "Evento ao vivo — NutriConnect" }] }),
  component: EventPage,
});

const card = "rounded-3xl border border-border bg-card p-5 shadow-card";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
// Botões pequenos: 40 px de altura no celular (alvo de toque), 32 px no computador.
const btnSecondary =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary";
const iconBtn =
  "inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold sm:min-h-8 sm:px-2 sm:text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50";
const field =
  "w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground";

const onError = (err: unknown) => toast.error((err as Error).message);

/** Arquivo .ics do evento para pôr na agenda do celular/computador (com aviso 15 min antes). */
function downloadIcs(e: {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  duration_min: number;
}) {
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const esc = (v: string) =>
    v
      .replace(/\\/g, "\\\\")
      .replace(/[,;]/g, (m) => "\\" + m)
      .replace(/\n/g, "\\n");
  const start = new Date(e.starts_at);
  const end = new Date(start.getTime() + e.duration_min * 60_000);
  const url = `${window.location.origin}/evento/${e.id}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NutriConnect//Eventos//PT",
    "BEGIN:VEVENT",
    `UID:${e.id}@nutriconnect`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(`${e.description ?? ""}\n${url}`.trim())}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "evento-nutriconnect.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function EventPage() {
  const { user, hydrated } = useRequireAuth();
  if (!hydrated || !user) return <AuthGateLoading />;
  return (
    <AppScreen>
      <EventView me={user.id} />
    </AppScreen>
  );
}

function EventView({ me }: { me: string }) {
  const { eventId } = Route.useParams();
  const tr = useTr();
  const when = useEventDate();
  const event = useCommunityEvent(eventId);
  const questions = useEventQuestions(eventId);
  const cancel = useCancelEvent();
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEventRealtime(eventId);

  const authors = [...new Set((questions.data ?? []).map((q) => q.author_id))].sort();
  const people = useQuery({
    queryKey: ["event-people", ...authors],
    enabled: authors.length > 0,
    queryFn: () => cardsByIds(authors),
  });

  if (event.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const e = event.data;
  if (!e) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {tr([
            "Evento não encontrado. Ele é só para quem participa da comunidade.",
            "Event not found. It's only for community members.",
            "Evento no encontrado. Es solo para quien participa de la comunidad.",
            "Événement introuvable. Il est réservé aux membres de la communauté.",
          ])}
        </p>
        <Link to="/comunidades" className={cn(btnPrimary, "mt-4")}>
          {tr(["Ver comunidades", "See communities", "Ver comunidades", "Voir les communautés"])}
        </Link>
      </div>
    );
  }

  const phase = phaseOf(e);
  const isHost = e.host_id === me;
  const canAsk = phase === "agendado" || phase === "ao_vivo";
  const list = questions.data ?? [];
  const answered = list.filter((q) => q.answer);
  const open = list.filter((q) => !q.answer);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {e.communities && (
        <Link
          to="/comunidades/$slug"
          params={{ slug: e.communities.slug }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {e.communities.name}
        </Link>
      )}

      <header className={card}>
        <PhaseBadge event={e} />
        <h1 className="mt-2 text-2xl font-extrabold font-display text-foreground">{e.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
          {when(e.starts_at)} · {e.duration_min} min
        </p>
        {e.description && (
          <p className="mt-3 whitespace-pre-line text-left text-sm text-foreground/85">
            {e.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {phase === "agendado" && (
            <button type="button" className={btnSecondary} onClick={() => downloadIcs(e)}>
              <CalendarPlus className="h-4 w-4" />
              {tr([
                "Lembrar-me (pôr na agenda)",
                "Remind me (add to calendar)",
                "Recordarme (añadir a la agenda)",
                "Me le rappeler (agenda)",
              ])}
            </button>
          )}
          {isHost && phase !== "encerrado" && phase !== "cancelado" && (
            <button
              type="button"
              className={iconBtn}
              disabled={cancel.isPending}
              onClick={() => setConfirmCancel(true)}
            >
              <XCircle className="h-3.5 w-3.5" />
              {tr(["Cancelar evento", "Cancel event", "Cancelar evento", "Annuler"])}
            </button>
          )}
        </div>
        <ConfirmAction
          open={confirmCancel}
          onOpenChange={setConfirmCancel}
          title={tr([
            "Cancelar o evento?",
            "Cancel the event?",
            "¿Cancelar el evento?",
            "Annuler l'événement ?",
          ])}
          description={tr([
            "Quem participa da comunidade vê o evento como cancelado e não dá mais para enviar perguntas.",
            "Community members will see the event as cancelled and no more questions can be sent.",
            "Los miembros verán el evento como cancelado y no se podrán enviar más preguntas.",
            "Les membres verront l'événement annulé et ne pourront plus poser de questions.",
          ])}
          confirmLabel={tr([
            "Cancelar evento",
            "Cancel event",
            "Cancelar evento",
            "Annuler l'événement",
          ])}
          cancelLabel={tr(["Manter evento", "Keep event", "Mantener evento", "Garder"])}
          onConfirm={() => cancel.mutate(e.id, { onError })}
        />
      </header>

      {canAsk && !isHost && <AskForm eventId={e.id} />}

      {answered.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {tr(["Respondidas", "Answered", "Respondidas", "Répondues"])}
          </h2>
          <ul className="space-y-3">
            {answered.map((q) => (
              <QuestionItem
                key={q.id}
                q={q}
                eventId={e.id}
                me={me}
                isHost={isHost}
                author={people.data?.get(q.author_id)}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {tr(["Perguntas", "Questions", "Preguntas", "Questions"])} ({open.length})
        </h2>
        {questions.isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : open.length === 0 ? (
          <p className={cn(card, "text-center text-sm text-muted-foreground")}>
            {canAsk
              ? tr([
                  "Nenhuma pergunta ainda. Que tal mandar a primeira?",
                  "No questions yet. Why not send the first?",
                  "Aún no hay preguntas. ¿Envías la primera?",
                  "Pas encore de question. Posez la première !",
                ])
              : tr([
                  "Sem perguntas abertas.",
                  "No open questions.",
                  "Sin preguntas abiertas.",
                  "Aucune question ouverte.",
                ])}
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((q) => (
              <QuestionItem
                key={q.id}
                q={q}
                eventId={e.id}
                me={me}
                isHost={isHost}
                author={people.data?.get(q.author_id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AskForm({ eventId }: { eventId: string }) {
  const tr = useTr();
  const ask = useAskQuestion(eventId);
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask.mutate(text, {
      onSuccess: () => {
        setText("");
        toast.success(
          tr(["Pergunta enviada!", "Question sent!", "¡Pregunta enviada!", "Question envoyée !"]),
        );
      },
      onError,
    });
  };

  return (
    <form onSubmit={submit} className={cn(card, "mt-6")}>
      <label className="text-sm font-bold text-foreground" htmlFor="pergunta">
        {tr(["Sua pergunta", "Your question", "Tu pregunta", "Votre question"])}
      </label>
      <textarea
        id="pergunta"
        value={text}
        rows={3}
        maxLength={QUESTION_MAX}
        onChange={(e) => setText(e.target.value)}
        placeholder={tr([
          "Pergunte sobre o tema do evento. Evite dados pessoais de saúde: a pergunta é vista pela comunidade.",
          "Ask about the event topic. Avoid personal health details: the community will see it.",
          "Pregunta sobre el tema. Evita datos personales de salud: la comunidad la verá.",
          "Posez votre question sur le sujet. Évitez les données de santé personnelles : la communauté la verra.",
        ])}
        className={cn(field, "mt-2")}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {text.length}/{QUESTION_MAX} ·{" "}
          {tr(["até 3 por pessoa", "up to 3 each", "hasta 3 por persona", "3 maximum"])}
        </span>
        <button
          type="submit"
          className={btnPrimary}
          disabled={text.trim().length < QUESTION_MIN || ask.isPending}
        >
          <Send className="h-3.5 w-3.5" />
          {tr(["Enviar", "Send", "Enviar", "Envoyer"])}
        </button>
      </div>
    </form>
  );
}

function QuestionItem({
  q,
  eventId,
  me,
  isHost,
  author,
}: {
  q: EventQuestion;
  eventId: string;
  me: string;
  isHost: boolean;
  author?: PersonCard;
}) {
  const tr = useTr();
  const vote = useVoteQuestion(eventId);
  const flag = useFlagQuestion();
  const remove = useDeleteQuestion();
  const moderate = useModerateQuestion();
  const answer = useAnswerQuestion();
  const [replying, setReplying] = useState(false);
  const [confirming, setConfirming] = useState<"apagar" | "denunciar" | null>(null);
  const [reply, setReply] = useState(q.answer ?? "");
  const mine = q.author_id === me;

  return (
    <li className={cn(card, q.pinned && "border-accent/50", q.hidden && "opacity-60")}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => vote.mutate(q.id, { onError })}
          disabled={mine || vote.isPending}
          aria-pressed={q.voted}
          aria-label={`${tr([
            "Também quero saber",
            "I want to know too",
            "Yo también quiero saber",
            "Moi aussi",
          ])} (${q.votes} ${
            q.votes === 1
              ? tr(["voto", "vote", "voto", "vote"])
              : tr(["votos", "votes", "votos", "votes"])
          })`}
          title={tr([
            "Também quero saber",
            "I want to know too",
            "Yo también quiero saber",
            "Moi aussi",
          ])}
          className={cn(
            "flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border text-sm font-bold transition disabled:cursor-default",
            q.voted
              ? "border-accent bg-accent-soft text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronUp className="h-4 w-4" />
          {q.votes}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-primary-soft text-[9px] font-bold text-primary">
              {author?.avatarUrl ? (
                <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(author?.name ?? "?")
              )}
            </span>
            <span className="font-semibold text-foreground">
              {mine ? tr(["Você", "You", "Tú", "Vous"]) : (author?.name ?? "…")}
            </span>
            {q.pinned && (
              <span className="inline-flex items-center gap-0.5 text-accent">
                <Pin className="h-3 w-3" /> {tr(["Fixada", "Pinned", "Fijada", "Épinglée"])}
              </span>
            )}
            {q.hidden && (
              <span className="inline-flex items-center gap-0.5">
                <EyeOff className="h-3 w-3" /> {tr(["Oculta", "Hidden", "Oculta", "Masquée"])}
              </span>
            )}
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-left text-sm text-foreground">
            {q.body}
          </p>

          {q.answer && !replying && (
            <div className="mt-3 rounded-2xl bg-accent-soft/40 p-3">
              <p className="flex items-center gap-1 text-[11px] font-bold text-accent">
                <MessageCircleReply className="h-3.5 w-3.5" />
                {tr(["Resposta", "Answer", "Respuesta", "Réponse"])}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-left text-sm text-foreground">
                {q.answer}
              </p>
            </div>
          )}

          {replying && (
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                answer.mutate(
                  { questionId: q.id, answer: reply, pin: true },
                  { onSuccess: () => setReplying(false), onError },
                );
              }}
            >
              <textarea
                value={reply}
                rows={4}
                maxLength={2000}
                onChange={(e) => setReply(e.target.value)}
                className={field}
                placeholder={tr(["Sua resposta", "Your answer", "Tu respuesta", "Votre réponse"])}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  className={btnPrimary}
                  disabled={!reply.trim() || answer.isPending}
                >
                  {tr([
                    "Responder e fixar",
                    "Answer and pin",
                    "Responder y fijar",
                    "Répondre et épingler",
                  ])}
                </button>
                <button type="button" className={iconBtn} onClick={() => setReplying(false)}>
                  {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
                </button>
              </div>
            </form>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {isHost && !replying && (
              <>
                <button type="button" className={iconBtn} onClick={() => setReplying(true)}>
                  <MessageCircleReply className="h-3.5 w-3.5" />
                  {q.answer
                    ? tr(["Editar resposta", "Edit answer", "Editar respuesta", "Modifier"])
                    : tr(["Responder", "Answer", "Responder", "Répondre"])}
                </button>
                <button
                  type="button"
                  className={iconBtn}
                  disabled={moderate.isPending}
                  onClick={() =>
                    moderate.mutate({ questionId: q.id, pinned: !q.pinned }, { onError })
                  }
                >
                  {q.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  {q.pinned
                    ? tr(["Desafixar", "Unpin", "Desfijar", "Désépingler"])
                    : tr(["Fixar", "Pin", "Fijar", "Épingler"])}
                </button>
                <button
                  type="button"
                  className={iconBtn}
                  disabled={moderate.isPending}
                  onClick={() =>
                    moderate.mutate({ questionId: q.id, hidden: !q.hidden }, { onError })
                  }
                >
                  {q.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {q.hidden
                    ? tr(["Mostrar", "Show", "Mostrar", "Afficher"])
                    : tr(["Ocultar", "Hide", "Ocultar", "Masquer"])}
                </button>
              </>
            )}
            {mine && !q.answer && (
              <button
                type="button"
                className={iconBtn}
                disabled={remove.isPending}
                onClick={() => setConfirming("apagar")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {tr(["Apagar", "Delete", "Borrar", "Supprimer"])}
              </button>
            )}
            {!mine && !isHost && (
              <button
                type="button"
                className={iconBtn}
                disabled={flag.isPending}
                onClick={() => setConfirming("denunciar")}
              >
                <Flag className="h-3.5 w-3.5" />
                {tr(["Denunciar", "Report", "Denunciar", "Signaler"])}
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmAction
        open={confirming === "apagar"}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={tr([
          "Apagar sua pergunta?",
          "Delete your question?",
          "¿Borrar tu pregunta?",
          "Supprimer votre question ?",
        ])}
        description={tr([
          "Os votos dela somem junto. Você pode enviar outra depois.",
          "Its votes go away too. You can send another one later.",
          "Sus votos también desaparecen. Puedes enviar otra después.",
          "Ses votes disparaissent aussi. Vous pourrez en envoyer une autre.",
        ])}
        confirmLabel={tr(["Apagar", "Delete", "Borrar", "Supprimer"])}
        onConfirm={() => remove.mutate(q.id, { onError })}
      />
      <ConfirmAction
        open={confirming === "denunciar"}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={tr([
          "Denunciar esta pergunta?",
          "Report this question?",
          "¿Denunciar esta pregunta?",
          "Signaler cette question ?",
        ])}
        description={tr([
          "O profissional e a moderação vão revisar. Quem escreveu não fica sabendo que foi você.",
          "The professional and moderators will review it. The author won't know it was you.",
          "El profesional y la moderación la revisarán. Quien la escribió no sabrá que fuiste tú.",
          "Le professionnel et la modération vont l'examiner. L'auteur ne saura pas que c'était vous.",
        ])}
        confirmLabel={tr(["Denunciar", "Report", "Denunciar", "Signaler"])}
        onConfirm={() =>
          flag.mutate(q.id, {
            onSuccess: () =>
              toast.success(
                tr([
                  "Obrigado por avisar.",
                  "Thanks for letting us know.",
                  "Gracias por avisar.",
                  "Merci de nous avoir prévenus.",
                ]),
              ),
            onError,
          })
        }
      />
    </li>
  );
}
