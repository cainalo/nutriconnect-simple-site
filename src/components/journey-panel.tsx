// Parceiro de jornada (N6): sem dupla, mostra os convites e a lista de amigos para convidar; com
// dupla, o check-in de hoje dos dois, "mandar força", a sequência gentil e o botão de sair.
import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { HandHeart, HeartHandshake, Loader2, LogOut, Send, Sun, UserPlus, X } from "lucide-react";
import { EmojiIcon } from "@/components/emoji-icon";
import { SupportCard } from "@/components/no-numbers";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useLinks } from "@/lib/clinical/queries";
import { checkinDay } from "@/lib/checkins";
import { initials } from "@/lib/community";
import {
  MOODS,
  NOTE_MAX,
  moodOf,
  needsSupport,
  pairStreak,
  useJourneyCheckin,
  useJourneyCheer,
  useJourneyInvite,
  useJourneyLeave,
  useJourneyPairs,
  useJourneyPeople,
  useJourneyRespond,
  useMyJourneyCheckins,
  usePartnerStatus,
  type JourneyMood,
  type PartnerStatus,
} from "@/lib/journey";
import type { PersonCard } from "@/lib/social/api";
import { useFriends } from "@/lib/social/queries";
import { cn } from "@/lib/utils";

const card = "rounded-3xl border border-border/70 bg-card p-5 shadow-xs";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const btnSoft =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";

const onError = (err: unknown) => toast.error((err as Error).message);

function Avatar({ person, size = 40 }: { person?: PersonCard; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full avatar-shape bg-primary-soft text-xs font-bold text-primary"
      style={{ width: size, height: size }}
    >
      {person?.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(person?.name ?? "?")
      )}
    </span>
  );
}

export function JourneyPanel() {
  const tr = useTr();
  const { user } = useAuth();
  const me = user?.id;
  const pairs = useJourneyPairs(me);
  const status = usePartnerStatus(me);

  const rows = pairs.data ?? [];
  const incoming = rows.filter((p) => p.status === "pendente" && p.user_b === me);
  const outgoing = rows.find((p) => p.status === "pendente" && p.user_a === me);
  const people = useJourneyPeople([
    ...incoming.map((p) => p.user_a),
    ...(outgoing ? [outgoing.user_b] : []),
    ...(status.data && me ? [status.data.partnerId, me] : []),
  ]);

  const loading = pairs.isLoading || status.isLoading;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 data-page-head className="text-2xl font-extrabold font-display text-foreground">
          {tr([
            "Parceiro de jornada",
            "Journey buddy",
            "Compañero de camino",
            "Binôme de parcours",
          ])}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {tr([
            "Uma dupla de apoio com um amigo: um check-in por dia contando como foi, um recado curto e uma força quando o dia pesar. Sem peso, sem calorias, sem comparação.",
            "A support pair with a friend: one check-in a day about how it went, a short note and some encouragement when the day is heavy. No weight, no calories, no comparing.",
            "Una pareja de apoyo con un amigo: un registro al día contando cómo fue, un mensaje corto y un empujón cuando el día pese. Sin peso, sin calorías, sin comparar.",
            "Un binôme de soutien avec un ami : un point par jour sur votre journée, un petit mot et un encouragement quand c'est dur. Sans poids, sans calories, sans comparaison.",
          ])}
        </p>
      </header>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : status.data ? (
        <ActivePair
          status={status.data}
          partner={people.data?.get(status.data.partnerId)}
          self={me ? people.data?.get(me) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {incoming.map((p) => (
            <IncomingInvite key={p.id} pairId={p.id} from={people.data?.get(p.user_a)} />
          ))}
          {outgoing && (
            <OutgoingInvite pairId={outgoing.id} to={people.data?.get(outgoing.user_b)} />
          )}
          <InviteFriends pendingTo={outgoing?.user_b} />
          <HowItWorks />
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── Sem dupla ─────────────────────────────

function IncomingInvite({ pairId, from }: { pairId: string; from?: PersonCard }) {
  const tr = useTr();
  const respond = useJourneyRespond();
  return (
    <div
      className={cn(card, "flex flex-wrap items-center gap-3 border-accent/40 bg-accent-soft/30")}
    >
      <Avatar person={from} />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        <strong>{from?.name ?? "…"}</strong>{" "}
        {tr([
          "convidou você para ser parceiro(a) de jornada.",
          "invited you to be journey buddies.",
          "te invitó a ser compañeros de camino.",
          "vous invite à devenir binôme de parcours.",
        ])}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={respond.isPending}
          onClick={() =>
            respond.mutate(
              { pairId, accept: true },
              {
                onSuccess: () =>
                  toast.success(
                    tr([
                      "Dupla formada!",
                      "You're a pair now!",
                      "¡Pareja formada!",
                      "Binôme formé !",
                    ]),
                  ),
                onError,
              },
            )
          }
        >
          {tr(["Aceitar", "Accept", "Aceptar", "Accepter"])}
        </button>
        <button
          type="button"
          className={btnSoft}
          disabled={respond.isPending}
          onClick={() => respond.mutate({ pairId, accept: false }, { onError })}
        >
          {tr(["Agora não", "Not now", "Ahora no", "Pas maintenant"])}
        </button>
      </div>
    </div>
  );
}

function OutgoingInvite({ pairId, to }: { pairId: string; to?: PersonCard }) {
  const tr = useTr();
  const leave = useJourneyLeave();
  return (
    <div className={cn(card, "flex flex-wrap items-center gap-3")}>
      <Avatar person={to} />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        {tr([
          "Convite enviado para",
          "Invitation sent to",
          "Invitación enviada a",
          "Invitation envoyée à",
        ])}{" "}
        <strong>{to?.name ?? "…"}</strong>.{" "}
        <span className="text-muted-foreground">
          {tr([
            "A dupla começa quando a pessoa aceitar.",
            "The pair starts once they accept.",
            "La pareja empieza cuando acepte.",
            "Le binôme commence dès qu'il/elle accepte.",
          ])}
        </span>
      </p>
      <button
        type="button"
        className={btnSoft}
        disabled={leave.isPending}
        onClick={() => leave.mutate(pairId, { onError })}
      >
        <X className="h-3.5 w-3.5" />
        {tr(["Cancelar convite", "Cancel invitation", "Cancelar invitación", "Annuler"])}
      </button>
    </div>
  );
}

function InviteFriends({ pendingTo }: { pendingTo?: string }) {
  const tr = useTr();
  const friends = useFriends();
  const invite = useJourneyInvite();
  const list = friends.data ?? [];

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <UserPlus className="h-4 w-4 text-accent" />
        {tr([
          "Convide um amigo para a dupla",
          "Invite a friend to pair up",
          "Invita a un amigo a la pareja",
          "Invitez un ami à former un binôme",
        ])}
      </h2>
      {friends.isLoading ? (
        <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
      ) : list.length === 0 ? (
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            {tr([
              "A dupla é feita entre amigos. Adicione alguém de confiança primeiro.",
              "Pairs are made between friends. Add someone you trust first.",
              "La pareja se forma entre amigos. Agrega primero a alguien de confianza.",
              "Le binôme se fait entre amis. Ajoutez d'abord quelqu'un de confiance.",
            ])}
          </p>
          <Link to="/explorar" className={cn(btnPrimary, "mt-3")}>
            {tr([
              "Encontrar pessoas",
              "Find people",
              "Encontrar personas",
              "Trouver des personnes",
            ])}
          </Link>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {list.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2">
              <Avatar person={f} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {f.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  @{f.username}
                </span>
              </span>
              {pendingTo === f.id ? (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {tr(["Convidado(a)", "Invited", "Invitado(a)", "Invité(e)"])}
                </span>
              ) : (
                <button
                  type="button"
                  className={btnSoft}
                  disabled={invite.isPending}
                  onClick={() =>
                    invite.mutate(f.id, {
                      onSuccess: () =>
                        toast.success(
                          tr([
                            "Convite enviado!",
                            "Invitation sent!",
                            "¡Invitación enviada!",
                            "Invitation envoyée !",
                          ]),
                        ),
                      onError,
                    })
                  }
                >
                  {tr(["Convidar", "Invite", "Invitar", "Inviter"])}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HowItWorks() {
  const tr = useTr();
  const items: [string, string, string, string][] = [
    [
      "Cada um faz um check-in por dia: como foi o dia e, se quiser, um recado curto.",
      "Each of you checks in once a day: how it went and, if you like, a short note.",
      "Cada uno hace un registro al día: cómo fue y, si quiere, un mensaje corto.",
      "Chacun fait un point par jour : comment ça s'est passé et, si vous voulez, un petit mot.",
    ],
    [
      "O parceiro vê só o check-in do dia. Diário, metas, peso e plano continuam só seus.",
      "Your buddy only sees today's check-in. Diary, goals, weight and plan stay yours.",
      "Tu compañero solo ve el registro del día. Diario, metas, peso y plan siguen siendo tuyos.",
      "Votre binôme ne voit que le point du jour. Journal, objectifs, poids et plan restent à vous.",
    ],
    [
      "Dá para mandar uma força por dia, e a sequência da dupla não zera se um dia passar em branco.",
      "You can send encouragement once a day, and the pair streak doesn't reset if a day goes blank.",
      "Puedes mandar ánimo una vez al día, y la racha no se reinicia si un día queda en blanco.",
      "Un encouragement par jour, et la série du binôme ne repart pas à zéro après un jour sans point.",
    ],
    [
      "Qualquer um pode sair da dupla quando quiser, sem aviso para o outro.",
      "Either of you can leave whenever you want, with no notice to the other.",
      "Cualquiera puede salir cuando quiera, sin aviso al otro.",
      "Chacun peut quitter le binôme quand il veut, sans que l'autre soit prévenu.",
    ],
  ];
  return (
    <section className={cn(card, "bg-secondary/40")}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <HeartHandshake className="h-4 w-4 text-accent" />
        {tr(["Como funciona", "How it works", "Cómo funciona", "Comment ça marche"])}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground/85">
        {items.map((t) => (
          <li key={t[0]}>{tr(t)}</li>
        ))}
      </ul>
    </section>
  );
}

// ───────────────────────────── Com dupla ─────────────────────────────

function ActivePair({
  status,
  partner,
  self,
}: {
  status: PartnerStatus;
  partner?: PersonCard;
  self?: PersonCard;
}) {
  const tr = useTr();
  const { user } = useAuth();
  const mine = useMyJourneyCheckins(user?.id);
  const links = useLinks("patient");
  const hasCare = (links.data ?? []).some((l) => l.status === "ativo");
  const leave = useJourneyLeave();
  const cheer = useJourneyCheer();

  const today = (mine.data ?? []).find((c) => c.day === checkinDay());
  const streak = pairStreak(status.togetherDays);
  const partnerMood = moodOf(status.partnerToday?.mood);
  const name = partner?.name ?? "…";
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-4">
      {/* Dupla e sequência */}
      <section className={cn(card, "flex flex-wrap items-center gap-4")}>
        <div className="flex -space-x-3">
          <Avatar person={self} size={48} />
          <Avatar person={partner} size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {tr(["Você e", "You and", "Tú y", "Vous et"])} {name}
          </p>
          <p className="text-xs text-muted-foreground">
            {streak.together > 0
              ? tr([
                  `${streak.together} ${streak.together === 1 ? "dia" : "dias"} de check-in juntos`,
                  `${streak.together} ${streak.together === 1 ? "day" : "days"} checking in together`,
                  `${streak.together} ${streak.together === 1 ? "día" : "días"} de registro juntos`,
                  `${streak.together} ${streak.together === 1 ? "jour" : "jours"} de point ensemble`,
                ])
              : tr([
                  "Façam o primeiro check-in juntos hoje.",
                  "Do your first check-in together today.",
                  "Hagan hoy su primer registro juntos.",
                  "Faites votre premier point ensemble aujourd'hui.",
                ])}
          </p>
          <div className="mt-2 flex gap-1" aria-hidden>
            {streak.last7.map((done, i) => (
              <span
                key={i}
                className={cn("h-2 w-6 rounded-full", done ? "bg-primary" : "bg-secondary")}
              />
            ))}
          </div>
        </div>
      </section>

      {needsSupport(mine.data ?? []) && <SupportCard hasCare={hasCare} />}

      {/* Meu check-in */}
      <MyCheckin
        key={today?.updated_at ?? "novo"}
        mood={today?.mood as JourneyMood | undefined}
        note={today?.note ?? ""}
      />

      {/* Check-in do parceiro */}
      <section className={card}>
        <h2 className="text-sm font-bold text-foreground">
          {tr(["Hoje,", "Today,", "Hoy,", "Aujourd'hui,"])} {firstName}
        </h2>
        {partnerMood ? (
          <div className="mt-2 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft">
              <EmojiIcon emoji={partnerMood.emoji} tinted className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{tr(partnerMood.name)}</p>
              {status.partnerToday?.note && (
                <p className="mt-1 text-sm text-foreground/85">“{status.partnerToday.note}”</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {tr([
              "Ainda não fez o check-in de hoje.",
              "Hasn't checked in yet today.",
              "Todavía no hizo el registro de hoy.",
              "N'a pas encore fait son point aujourd'hui.",
            ])}
          </p>
        )}
        {status.cheerReceived && (
          <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-accent-soft/50 px-3 py-2 text-xs font-semibold text-foreground">
            <HandHeart className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {tr([
              `${firstName} mandou força para você hoje.`,
              `${firstName} sent you encouragement today.`,
              `${firstName} te mandó ánimo hoy.`,
              `${firstName} vous a encouragé(e) aujourd'hui.`,
            ])}
          </p>
        )}
        <button
          type="button"
          className={cn(btnPrimary, "mt-4")}
          disabled={status.cheerSent || cheer.isPending}
          onClick={() =>
            cheer.mutate(undefined, {
              onSuccess: () =>
                toast.success(
                  tr([
                    "Força enviada!",
                    "Encouragement sent!",
                    "¡Ánimo enviado!",
                    "Encouragement envoyé !",
                  ]),
                ),
              onError,
            })
          }
        >
          <HandHeart className="h-4 w-4" />
          {status.cheerSent
            ? tr(["Força enviada hoje", "Sent today", "Ánimo enviado hoy", "Envoyé aujourd'hui"])
            : tr(["Mandar força", "Send encouragement", "Mandar ánimo", "Encourager"])}
        </button>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          disabled={leave.isPending}
          onClick={() => {
            if (
              !window.confirm(
                tr([
                  "Sair da dupla? A outra pessoa não recebe aviso.",
                  "Leave the pair? The other person won't be notified.",
                  "¿Salir de la pareja? La otra persona no recibe aviso.",
                  "Quitter le binôme ? L'autre personne ne sera pas prévenue.",
                ]),
              )
            )
              return;
            leave.mutate(undefined, { onError });
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          {tr(["Sair da dupla", "Leave the pair", "Salir de la pareja", "Quitter le binôme"])}
        </button>
      </div>
    </div>
  );
}

function MyCheckin({ mood: savedMood, note: savedNote }: { mood?: JourneyMood; note: string }) {
  const tr = useTr();
  const save = useJourneyCheckin();
  const [mood, setMood] = useState<JourneyMood | undefined>(savedMood);
  const [note, setNote] = useState(savedNote);

  const dirty = mood !== savedMood || note.trim() !== savedNote;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!mood) return;
    save.mutate(
      { mood, note },
      {
        onSuccess: () =>
          toast.success(
            tr(["Check-in feito!", "Checked in!", "¡Registro hecho!", "Point enregistré !"]),
          ),
        onError,
      },
    );
  };

  return (
    <form onSubmit={submit} className={card}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Sun className="h-4 w-4 text-accent" />
        {tr([
          "Como foi o seu dia?",
          "How was your day?",
          "¿Cómo fue tu día?",
          "Comment s'est passée votre journée ?",
        ])}
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mood === m.id}
            onClick={() => setMood(m.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs font-semibold transition",
              mood === m.id
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <EmojiIcon emoji={m.emoji} tinted className="h-7 w-7" />
            {tr(m.name)}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">
          {tr([
            "Recado para a dupla",
            "Note for your buddy",
            "Mensaje para tu pareja",
            "Mot pour votre binôme",
          ])}
        </span>
        <input
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          placeholder={tr([
            "Um recado curto (opcional)",
            "A short note (optional)",
            "Un mensaje corto (opcional)",
            "Un petit mot (facultatif)",
          ])}
          className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </label>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {note.length}/{NOTE_MAX}
        </span>
        <button type="submit" className={btnPrimary} disabled={!mood || !dirty || save.isPending}>
          <Send className="h-3.5 w-3.5" />
          {savedMood
            ? tr(["Atualizar", "Update", "Actualizar", "Mettre à jour"])
            : tr(["Fazer check-in", "Check in", "Registrar", "Enregistrer"])}
        </button>
      </div>
    </form>
  );
}
