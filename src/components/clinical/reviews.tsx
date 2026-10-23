// Avaliações verificadas (P1): estrelas, formulário de avaliação da consulta e a seção de
// avaliações no perfil do profissional (com a resposta dele).
import { useState } from "react";
import { BadgeCheck, MessageSquareReply, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Avatar,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/clinical/ui";
import { useTr } from "@/components/settings-ui";
import { useClinicalI18n } from "@/lib/clinical/i18n";
import { formatDate } from "@/lib/clinical/format";
import {
  useDeleteReview,
  useProReviews,
  useReplyReview,
  useSubmitReview,
  type MyReview,
  type RatingSummary,
} from "@/lib/clinical/reviews";
import { cn } from "@/lib/utils";

const RATING_WORDS: [string, string, string, string][] = [
  ["Ruim", "Poor", "Mala", "Mauvaise"],
  ["Regular", "Fair", "Regular", "Passable"],
  ["Boa", "Good", "Buena", "Bonne"],
  ["Muito boa", "Very good", "Muy buena", "Très bonne"],
  ["Excelente", "Excellent", "Excelente", "Excellente"],
];

/** Estrelas só de leitura (aceita meia estrela pela largura do preenchimento). */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="relative inline-flex" aria-hidden>
      <span className="flex text-border">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} style={{ width: size, height: size }} className="fill-current" />
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 flex overflow-hidden text-warning"
        style={{ width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} style={{ width: size, height: size }} className="shrink-0 fill-current" />
        ))}
      </span>
    </span>
  );
}

/** "★ 4,8 (12)" para cards e cabeçalhos. Sem avaliações, mostra "Novo". */
export function RatingBadge({
  summary,
  className,
}: {
  summary?: RatingSummary;
  className?: string;
}) {
  const tr = useTr();
  const { locale } = useClinicalI18n();
  if (!summary || summary.total === 0) {
    return (
      <span className={cn("text-[11px] font-semibold text-muted-foreground", className)}>
        {tr(["Sem avaliações ainda", "No reviews yet", "Sin reseñas aún", "Pas encore d'avis"])}
      </span>
    );
  }
  const avg = summary.average.toLocaleString(locale, { minimumFractionDigits: 1 });
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold text-foreground",
        className,
      )}
      aria-label={tr([
        `Nota ${avg} de 5, ${summary.total} avaliações`,
        `Rated ${avg} out of 5, ${summary.total} reviews`,
        `Nota ${avg} de 5, ${summary.total} reseñas`,
        `Note ${avg} sur 5, ${summary.total} avis`,
      ])}
    >
      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
      {avg}
      <span className="font-normal text-muted-foreground">({summary.total})</span>
    </span>
  );
}

/** Formulário de avaliação de uma consulta (cria ou edita). */
export function ReviewDialog({
  appointmentId,
  proName,
  existing,
  open,
  onOpenChange,
}: {
  appointmentId: string;
  proName?: string;
  existing?: MyReview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tr = useTr();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [anonymous, setAnonymous] = useState(existing?.anonymous ?? false);
  const submit = useSubmitReview();
  const remove = useDeleteReview();
  const shown = hover || rating;

  const save = () =>
    submit.mutate(
      { appointmentId, rating, comment, anonymous },
      {
        onSuccess: () => {
          toast.success(
            tr([
              "Obrigado! Sua avaliação ajuda outras pessoas a escolher.",
              "Thank you! Your review helps others choose.",
              "¡Gracias! Tu reseña ayuda a otros a elegir.",
              "Merci ! Votre avis aide les autres à choisir.",
            ]),
          );
          onOpenChange(false);
        },
        onError: () =>
          toast.error(
            tr([
              "Não foi possível salvar a avaliação.",
              "Could not save the review.",
              "No se pudo guardar la reseña.",
              "Impossible d'enregistrer l'avis.",
            ]),
          ),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display">
            {tr([
              "Avaliar a consulta",
              "Rate the appointment",
              "Calificar la consulta",
              "Évaluer la consultation",
            ])}
          </DialogTitle>
          <DialogDescription>
            {proName
              ? tr([
                  `Como foi a consulta com ${proName}?`,
                  `How was your appointment with ${proName}?`,
                  `¿Cómo fue la consulta con ${proName}?`,
                  `Comment s'est passée la consultation avec ${proName} ?`,
                ])
              : tr([
                  "Como foi a consulta?",
                  "How was the appointment?",
                  "¿Cómo fue la consulta?",
                  "Comment s'est passée la consultation ?",
                ])}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex flex-col items-center gap-1 py-1"
          role="radiogroup"
          aria-label={tr(["Nota", "Rating", "Nota", "Note"])}
        >
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} — ${tr(RATING_WORDS[n - 1])}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="grid h-12 w-12 place-items-center rounded-xl transition active:scale-90"
              >
                <Star
                  className={cn(
                    "h-9 w-9 transition-all duration-200",
                    n <= shown ? "scale-110 fill-warning text-warning" : "text-border",
                  )}
                  style={{ transitionDelay: `${(n - 1) * 30}ms` }}
                />
              </button>
            ))}
          </div>
          <p className="h-5 text-sm font-semibold text-foreground">
            {shown ? tr(RATING_WORDS[shown - 1]) : ""}
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {tr([
              "Conte como foi (opcional)",
              "Tell us how it went (optional)",
              "Cuenta cómo fue (opcional)",
              "Racontez comment ça s'est passé (facultatif)",
            ])}
          </span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={600}
            rows={3}
            className={cn(inputClass, "resize-none")}
            placeholder={tr([
              "Atendimento, pontualidade, se as orientações ajudaram…",
              "Care, punctuality, whether the advice helped…",
              "Atención, puntualidad, si las orientaciones ayudaron…",
              "Accueil, ponctualité, si les conseils ont aidé…",
            ])}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-primary)]"
          />
          {tr([
            "Publicar sem o meu nome",
            "Post without my name",
            "Publicar sin mi nombre",
            "Publier sans mon nom",
          ])}
        </label>
        <p className="text-[11px] text-muted-foreground">
          {tr([
            "Não escreva dados de saúde seus. A avaliação aparece no perfil do profissional, marcada como consulta verificada.",
            "Don't write your own health details. The review shows on the professional's profile, marked as a verified appointment.",
            "No escribas datos de tu salud. La reseña aparece en el perfil del profesional, marcada como consulta verificada.",
            "N'écrivez pas vos données de santé. L'avis apparaît sur le profil du professionnel, marqué comme consultation vérifiée.",
          ])}
        </p>

        <div className="flex items-center justify-between gap-2">
          {existing ? (
            <button
              type="button"
              className={buttonGhost}
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(existing.id, {
                  onSuccess: () => onOpenChange(false),
                })
              }
            >
              <Trash2 className="h-4 w-4" />
              {tr(["Apagar", "Delete", "Eliminar", "Supprimer"])}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className={buttonPrimary}
            disabled={!rating || submit.isPending}
            onClick={save}
          >
            {tr(["Enviar avaliação", "Send review", "Enviar reseña", "Envoyer l'avis"])}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Botão da consulta passada: "Avaliar" ou a nota já dada (abre para editar). */
export function ReviewButton({
  appointmentId,
  proName,
  existing,
}: {
  appointmentId: string;
  proName?: string;
  existing?: MyReview;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={existing ? buttonGhost : buttonSecondary}
        onClick={() => setOpen(true)}
      >
        <Star className={cn("h-4 w-4", existing && "fill-warning text-warning")} />
        {existing
          ? tr([
              `Sua nota: ${existing.rating}`,
              `Your rating: ${existing.rating}`,
              `Tu nota: ${existing.rating}`,
              `Votre note : ${existing.rating}`,
            ])
          : tr(["Avaliar", "Rate", "Calificar", "Évaluer"])}
      </button>
      {open && (
        <ReviewDialog
          appointmentId={appointmentId}
          proName={proName}
          existing={existing}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}

/** Seção do perfil: média, barras por nota e as avaliações (o dono responde aqui). */
export function ProReviewsSection({
  proId,
  summary,
  isOwner,
}: {
  proId: string;
  summary?: RatingSummary;
  isOwner: boolean;
}) {
  const tr = useTr();
  const { locale } = useClinicalI18n();
  const [limit, setLimit] = useState(5);
  const reviews = useProReviews(proId, limit);
  const list = reviews.data ?? [];
  const total = summary?.total ?? 0;

  return (
    <section id="avaliacoes" className="scroll-mt-24">
      <div className="grid gap-5 sm:grid-cols-[11rem_1fr] sm:items-center">
        <div className="text-center sm:text-left">
          <p className="font-display text-5xl font-extrabold text-foreground">
            {total ? summary!.average.toLocaleString(locale, { minimumFractionDigits: 1 }) : "–"}
          </p>
          <Stars value={summary?.average ?? 0} size={18} />
          <p className="mt-1 text-xs text-muted-foreground">
            {tr([
              `${total} avaliações verificadas`,
              `${total} verified reviews`,
              `${total} reseñas verificadas`,
              `${total} avis vérifiés`,
            ])}
          </p>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = summary?.counts[n - 1] ?? 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right font-semibold text-muted-foreground">{n}</span>
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-warning transition-all duration-700"
                    style={{ width: total ? `${(c / total) * 100}%` : 0 }}
                  />
                </span>
                <span className="w-6 text-right text-muted-foreground">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
          {tr([
            "Ainda sem avaliações. Só quem teve consulta pelo NutriConnect pode avaliar.",
            "No reviews yet. Only people who had an appointment through NutriConnect can review.",
            "Aún sin reseñas. Solo quien tuvo consulta por NutriConnect puede calificar.",
            "Pas encore d'avis. Seules les personnes ayant consulté via NutriConnect peuvent évaluer.",
          ])}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((r, i) => (
            <li
              key={r.id}
              className="nc-rise rounded-2xl border border-border/70 bg-card p-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={r.authorName ?? tr(["Paciente", "Patient", "Paciente", "Patient"])}
                  url={r.authorAvatar ?? undefined}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {r.authorName ?? tr(["Paciente", "Patient", "Paciente", "Patient"])}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    {tr([
                      "Consulta verificada",
                      "Verified appointment",
                      "Consulta verificada",
                      "Consultation vérifiée",
                    ])}{" "}
                    ·{" "}
                    {formatDate(r.createdAt, locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {r.comment}
                </p>
              )}
              {r.reply && (
                <div className="mt-3 rounded-xl border-l-4 border-primary/50 bg-primary/5 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {tr([
                      "Resposta do profissional",
                      "Professional's reply",
                      "Respuesta del profesional",
                      "Réponse du professionnel",
                    ])}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground">{r.reply}</p>
                </div>
              )}
              {isOwner && <ReplyBox reviewId={r.id} current={r.reply} />}
            </li>
          ))}
        </ul>
      )}
      {list.length >= limit && (
        <button
          type="button"
          className={cn(buttonSecondary, "mt-4 w-full justify-center")}
          onClick={() => setLimit((l) => l + 10)}
        >
          {tr(["Ver mais avaliações", "See more reviews", "Ver más reseñas", "Voir plus d'avis"])}
        </button>
      )}
    </section>
  );
}

function ReplyBox({ reviewId, current }: { reviewId: string; current: string | null }) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current ?? "");
  const reply = useReplyReview();
  if (!open) {
    return (
      <button type="button" className={cn(buttonGhost, "mt-2")} onClick={() => setOpen(true)}>
        <MessageSquareReply className="h-4 w-4" />
        {current
          ? tr(["Editar resposta", "Edit reply", "Editar respuesta", "Modifier la réponse"])
          : tr(["Responder", "Reply", "Responder", "Répondre"])}
      </button>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={600}
        rows={3}
        className={cn(inputClass, "resize-none")}
        aria-label={tr(["Sua resposta", "Your reply", "Tu respuesta", "Votre réponse"])}
      />
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonGhost} onClick={() => setOpen(false)}>
          {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
        </button>
        <button
          type="button"
          className={buttonPrimary}
          disabled={reply.isPending}
          onClick={() =>
            reply.mutate(
              { reviewId, reply: text },
              {
                onSuccess: () => setOpen(false),
                onError: (e) => toast.error((e as Error).message),
              },
            )
          }
        >
          {tr(["Publicar resposta", "Post reply", "Publicar respuesta", "Publier la réponse"])}
        </button>
      </div>
    </div>
  );
}
