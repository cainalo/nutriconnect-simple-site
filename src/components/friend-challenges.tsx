// X3 — Aba "Com amigos" de Desafios: liga da semana (ranking gentil: quem não pontuou não aparece
// para os outros), convites, desafios da semana com placar em dias e "mandar força", e criar um
// desafio novo. Dados e regras em src/lib/friend-challenges.ts e no banco.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Crown, HandHeart, Loader2, Plus, Trophy, Users, X } from "lucide-react";
import { EmojiIcon } from "@/components/emoji-icon";
import { useTr } from "@/components/settings-ui";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/community";
import {
  METRICS,
  METRIC_BY_ID,
  useCheer,
  useCreateFriendChallenge,
  useLeague,
  useLeagueVisible,
  useMyFriendChallenges,
  useRespondFriendChallenge,
  useSetLeagueVisible,
  weekStartOf,
  type ChallengeMetric,
  type FriendChallenge,
  type LeagueRow,
} from "@/lib/friend-challenges";
import { useFriends } from "@/lib/social/queries";
import { cn } from "@/lib/utils";

const card = "rounded-3xl border border-border/70 bg-card p-5 shadow-xs";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const btnSoft =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";

const onError = (err: unknown) => toast.error((err as Error).message);

function Face({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full avatar-shape bg-primary-soft text-xs font-bold text-primary"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name || "?")
      )}
    </span>
  );
}

export function FriendsTab() {
  const { user } = useAuth();
  const challenges = useMyFriendChallenges(!!user);
  const [creating, setCreating] = useState(false);
  const tr = useTr();
  if (!user) return null;

  const all = challenges.data ?? [];
  const thisWeek = weekStartOf();
  const invites = all.filter((c) => c.my_status === "convidado");
  const current = all.filter((c) => c.my_status === "aceito" && c.week_start >= thisWeek);
  const past = all.filter((c) => c.my_status === "aceito" && c.week_start < thisWeek);

  return (
    <div className="space-y-6">
      <LeagueCard userId={user.id} />

      {invites.length > 0 && (
        <section className={card}>
          <h2 className="text-sm font-bold text-foreground">
            {tr(["Convites", "Invitations", "Invitaciones", "Invitations"])}
          </h2>
          <ul className="mt-3 space-y-2">
            {invites.map((c) => (
              <InviteRow key={c.id} challenge={c} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold font-display text-foreground">
              <Users className="h-5 w-5 text-accent" />
              {tr([
                "Desafios com amigos",
                "Challenges with friends",
                "Desafíos con amigos",
                "Défis entre amis",
              ])}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tr([
                "Uma meta de dias para a semana, junto com quem você gosta.",
                "A goal in days for the week, together with people you like.",
                "Una meta de días para la semana, junto a quien quieres.",
                "Un objectif en jours pour la semaine, avec ceux que vous aimez.",
              ])}
            </p>
          </div>
          {!creating && (
            <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {tr(["Novo desafio", "New challenge", "Nuevo desafío", "Nouveau défi"])}
            </button>
          )}
        </div>

        {creating && <CreateChallenge onClose={() => setCreating(false)} />}

        {challenges.isLoading ? (
          <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-muted-foreground" />
        ) : current.length === 0 && !creating ? (
          <div className={cn(card, "text-center")}>
            <EmojiIcon emoji="🤝" className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {tr([
                "Nenhum desafio nesta semana. Que tal chamar alguém para beber mais água junto?",
                "No challenges this week. How about inviting someone to drink more water together?",
                "Ningún desafío esta semana. ¿Y si invitas a alguien a tomar más agua juntos?",
                "Aucun défi cette semaine. Et si vous invitiez quelqu'un à boire plus d'eau ensemble ?",
              ])}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {current.map((c, i) => (
              <ChallengeCard key={c.id} challenge={c} index={i} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <details className={cn(card, "group")}>
          <summary className="cursor-pointer list-none text-sm font-bold text-foreground">
            {tr([
              `Semana passada (${past.length})`,
              `Last week (${past.length})`,
              `Semana pasada (${past.length})`,
              `Semaine dernière (${past.length})`,
            ])}
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {past.map((c, i) => (
              <ChallengeCard key={c.id} challenge={c} index={i} finished />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ───────────────────────── Liga ─────────────────────────

function LeagueCard({ userId }: { userId: string }) {
  const tr = useTr();
  const league = useLeague(true);
  const visible = useLeagueVisible(userId);
  const setVisible = useSetLeagueVisible();
  const rows = league.data ?? [];
  const me = rows.find((r) => r.is_me);
  const podium = rows.filter((r) => r.points > 0).slice(0, 3);
  const others = rows.filter((r) => r.points > 0).slice(3);
  // Ordem visual do pódio: 2º, 1º, 3º (o primeiro no meio).
  const stage = [podium[1], podium[0], podium[2]];

  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="flex items-center gap-2 text-lg font-bold font-display text-foreground">
            <Trophy className="h-5 w-5 text-amber-500" />
            {tr(["Liga da semana", "Weekly league", "Liga de la semana", "Ligue de la semaine"])}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tr([
              "Você e seus amigos. Cada dia em que alguém cuidou de si vale 1 ponto. Recomeça todo domingo.",
              "You and your friends. Each day someone took care of themselves is worth 1 point. Restarts every Sunday.",
              "Tú y tus amigos. Cada día en que alguien se cuidó vale 1 punto. Empieza de nuevo cada domingo.",
              "Vous et vos amis. Chaque jour où quelqu'un a pris soin de soi vaut 1 point. Repart chaque dimanche.",
            ])}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <Switch
            checked={visible.data ?? true}
            disabled={visible.isLoading || setVisible.isPending}
            onCheckedChange={(v) => setVisible.mutate(v, { onError })}
            aria-label={tr([
              "Aparecer na liga dos amigos",
              "Show me in friends' league",
              "Aparecer en la liga de amigos",
              "Apparaître dans la ligue des amis",
            ])}
          />
          {tr([
            "Aparecer para os amigos",
            "Visible to friends",
            "Visible para amigos",
            "Visible aux amis",
          ])}
        </label>
      </div>

      {league.isLoading ? (
        <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-muted-foreground" />
      ) : podium.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
          {tr([
            "Ninguém pontuou ainda nesta semana. Marque a água, os hábitos do dia ou faça uma lição para começar.",
            "No one has scored yet this week. Log your water, daily habits or do a lesson to start.",
            "Nadie sumó todavía esta semana. Marca el agua, los hábitos del día o haz una lección para empezar.",
            "Personne n'a encore marqué cette semaine. Notez votre eau, vos habitudes ou faites une leçon pour commencer.",
          ])}
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 items-end gap-2">
            {stage.map((r, i) => (
              <PodiumSpot key={r?.user_id ?? `vazio-${i}`} row={r} place={[2, 1, 3][i]} />
            ))}
          </div>
          {others.length > 0 && (
            <ul className="mt-4 divide-y divide-border/60">
              {others.map((r, i) => (
                <li
                  key={r.user_id}
                  className={cn(
                    "flex items-center gap-3 py-2",
                    r.is_me && "rounded-xl bg-primary/5 px-2",
                  )}
                >
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                    {i + 4}
                  </span>
                  <Face name={r.name} url={r.avatar_url} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {r.is_me ? tr(["Você", "You", "Tú", "Vous"]) : r.name}
                  </span>
                  <span className="text-sm font-bold text-foreground">{r.points}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {me && <MyBreakdown row={me} />}

      {rows.length <= 1 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {tr([
            "A liga fica mais divertida com amigos.",
            "The league is more fun with friends.",
            "La liga es más divertida con amigos.",
            "La ligue est plus amusante entre amis.",
          ])}{" "}
          <Link to="/explorar" className="font-semibold text-primary hover:underline">
            {tr([
              "Encontrar pessoas",
              "Find people",
              "Encontrar personas",
              "Trouver des personnes",
            ])}
          </Link>
        </p>
      )}
    </section>
  );
}

function PodiumSpot({ row, place }: { row?: LeagueRow; place: number }) {
  const tr = useTr();
  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" } as const;
  if (!row) return <div />;
  return (
    <div
      className="nc-rise flex min-w-0 flex-col items-center"
      style={{ animationDelay: `${place * 90}ms` }}
    >
      {place === 1 && <Crown className="mb-1 h-5 w-5 text-amber-500" />}
      <Face name={row.name} url={row.avatar_url} size={place === 1 ? 56 : 44} />
      <p className="mt-1 w-full truncate text-center text-xs font-semibold text-foreground">
        {row.is_me ? tr(["Você", "You", "Tú", "Vous"]) : row.name.split(" ")[0]}
      </p>
      <div
        className={cn(
          "mt-1 grid w-full place-items-center rounded-t-2xl font-display text-lg font-extrabold",
          heights[place as 1 | 2 | 3],
          place === 1
            ? "bg-amber-400/80 text-amber-950"
            : place === 2
              ? "bg-secondary text-foreground"
              : "bg-orange-200/70 text-orange-950 dark:bg-orange-300/40 dark:text-orange-50",
        )}
      >
        {row.points}
      </div>
    </div>
  );
}

function MyBreakdown({ row }: { row: LeagueRow }) {
  const tr = useTr();
  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {tr([
          `Seus pontos: ${row.points}`,
          `Your points: ${row.points}`,
          `Tus puntos: ${row.points}`,
          `Vos points : ${row.points}`,
        ])}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {METRICS.map((m) => (
          <div key={m.id} className="rounded-2xl bg-secondary/40 p-2 text-center">
            <EmojiIcon emoji={m.emoji} className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-0.5 text-sm font-bold text-foreground">{row[m.id]}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">{tr(m.names)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Desafios ─────────────────────────

function InviteRow({ challenge }: { challenge: FriendChallenge }) {
  const tr = useTr();
  const respond = useRespondFriendChallenge();
  const m = METRIC_BY_ID[challenge.metric];
  const creator = challenge.members.find((x) => x.user_id === challenge.creator_id);
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary/40 p-3">
      <EmojiIcon emoji={m.emoji} className="h-6 w-6 text-primary" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-semibold text-foreground">{challenge.title || tr(m.names)}</p>
        <p className="text-[11px] text-muted-foreground">
          {tr([
            `${creator?.name ?? "Um amigo"} chamou você · ${challenge.target} dias na semana`,
            `${creator?.name ?? "A friend"} invited you · ${challenge.target} days this week`,
            `${creator?.name ?? "Un amigo"} te invitó · ${challenge.target} días en la semana`,
            `${creator?.name ?? "Un ami"} vous invite · ${challenge.target} jours cette semaine`,
          ])}
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
        <button
          type="button"
          className={btnSoft}
          disabled={respond.isPending}
          onClick={() => respond.mutate({ id: challenge.id, accept: false }, { onError })}
        >
          <X className="h-3.5 w-3.5" />
          {tr(["Agora não", "Not now", "Ahora no", "Pas maintenant"])}
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={respond.isPending}
          onClick={() =>
            respond.mutate(
              { id: challenge.id, accept: true },
              {
                onSuccess: () =>
                  toast.success(tr(["Bora!", "Let's go!", "¡Vamos!", "C'est parti !"])),
                onError,
              },
            )
          }
        >
          <Check className="h-3.5 w-3.5" />
          {tr(["Topo", "I'm in", "Me sumo", "Partant"])}
        </button>
      </div>
    </li>
  );
}

function ChallengeCard({
  challenge,
  index,
  finished,
}: {
  challenge: FriendChallenge;
  index: number;
  finished?: boolean;
}) {
  const tr = useTr();
  const cheer = useCheer();
  const m = METRIC_BY_ID[challenge.metric];
  const accepted = challenge.members.filter((x) => x.status === "aceito");
  const waiting = challenge.members.filter((x) => x.status === "convidado");
  const done = accepted.filter((x) => x.days >= challenge.target).length;

  const sendCheer = (userId: string) =>
    cheer.mutate(
      { challengeId: challenge.id, userId },
      {
        onSuccess: (sent) =>
          sent
            ? toast.success(
                tr(["Força enviada!", "Cheer sent!", "¡Ánimo enviado!", "Encouragement envoyé !"]),
              )
            : toast.info(
                tr([
                  "Você já mandou força hoje para essa pessoa.",
                  "You already cheered this person today.",
                  "Ya le enviaste ánimo hoy.",
                  "Vous l'avez déjà encouragé aujourd'hui.",
                ]),
              ),
        onError,
      },
    );

  return (
    <article className={cn(card, "nc-rise")} style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10">
          <EmojiIcon emoji={m.emoji} className="h-6 w-6 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-foreground">
            {challenge.title || tr(m.names)}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {tr([
              `Meta: ${challenge.target} dias na semana`,
              `Goal: ${challenge.target} days this week`,
              `Meta: ${challenge.target} días en la semana`,
              `Objectif : ${challenge.target} jours dans la semaine`,
            ])}{" "}
            · {tr(m.how)}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {accepted.map((x) => {
          const pct = Math.min(100, Math.round((x.days / challenge.target) * 100));
          const reached = x.days >= challenge.target;
          return (
            <li key={x.user_id} className="flex items-center gap-3">
              <Face name={x.name} url={x.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-semibold text-foreground">
                    {x.is_me ? tr(["Você", "You", "Tú", "Vous"]) : x.name}
                  </span>
                  <span
                    className={cn("font-bold", reached ? "text-primary" : "text-muted-foreground")}
                  >
                    {x.days}/{challenge.target}
                    {reached && " ✓"}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      reached ? "bg-primary" : "bg-amber-400",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {!finished && !x.is_me && (
                <button
                  type="button"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-pink-500/10 hover:text-pink-600 active:scale-90"
                  aria-label={tr([
                    `Mandar força para ${x.name}`,
                    `Cheer ${x.name} on`,
                    `Enviar ánimo a ${x.name}`,
                    `Encourager ${x.name}`,
                  ])}
                  disabled={cheer.isPending}
                  onClick={() => sendCheer(x.user_id)}
                >
                  <HandHeart className="h-5 w-5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] text-muted-foreground">
        {finished
          ? tr([
              `${done} de ${accepted.length} chegaram à meta. Cada dia contou.`,
              `${done} of ${accepted.length} reached the goal. Every day counted.`,
              `${done} de ${accepted.length} llegaron a la meta. Cada día contó.`,
              `${done} sur ${accepted.length} ont atteint l'objectif. Chaque jour a compté.`,
            ])
          : waiting.length > 0
            ? tr([
                `Esperando resposta de ${waiting.map((w) => w.name.split(" ")[0]).join(", ")}`,
                `Waiting for ${waiting.map((w) => w.name.split(" ")[0]).join(", ")}`,
                `Esperando a ${waiting.map((w) => w.name.split(" ")[0]).join(", ")}`,
                `En attente de ${waiting.map((w) => w.name.split(" ")[0]).join(", ")}`,
              ])
            : tr([
                "Ninguém perde: vale cada dia que você cuidou de si.",
                "Nobody loses: every day you took care of yourself counts.",
                "Nadie pierde: vale cada día que te cuidaste.",
                "Personne ne perd : chaque jour où vous avez pris soin de vous compte.",
              ])}
      </p>
    </article>
  );
}

function CreateChallenge({ onClose }: { onClose: () => void }) {
  const tr = useTr();
  const friends = useFriends();
  const create = useCreateFriendChallenge();
  const [metric, setMetric] = useState<ChallengeMetric>("agua");
  const [target, setTarget] = useState(4);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const list = friends.data ?? [];

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 7 ? p : [...p, id]));

  const submit = () =>
    create.mutate(
      { metric, target, friends: picked, title },
      {
        onSuccess: () => {
          toast.success(
            tr([
              "Desafio criado! Seus amigos foram convidados.",
              "Challenge created! Your friends were invited.",
              "¡Desafío creado! Tus amigos fueron invitados.",
              "Défi créé ! Vos amis sont invités.",
            ]),
          );
          onClose();
        },
        onError,
      },
    );

  return (
    <div className={cn(card, "nc-rise mb-4 space-y-5")}>
      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">
          {tr(["O que vamos fazer?", "What will we do?", "¿Qué vamos a hacer?", "Que fait-on ?"])}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center text-[11px] font-semibold leading-tight transition active:scale-95",
                metric === m.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/70 text-muted-foreground hover:text-foreground",
              )}
            >
              <EmojiIcon emoji={m.emoji} className="h-6 w-6 text-primary" />
              {tr(m.names)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{tr(METRIC_BY_ID[metric].how)}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">
          {tr([
            "Quantos dias na semana?",
            "How many days this week?",
            "¿Cuántos días en la semana?",
            "Combien de jours cette semaine ?",
          ])}
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={target === n}
              onClick={() => setTarget(n)}
              className={cn(
                "h-11 rounded-xl border text-sm font-bold transition",
                target === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">
          {tr([
            "Com quem? (até 7 amigos)",
            "With whom? (up to 7 friends)",
            "¿Con quién? (hasta 7 amigos)",
            "Avec qui ? (jusqu'à 7 amis)",
          ])}
        </p>
        {friends.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : list.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {tr([
              "Você ainda não tem amigos no NutriConnect.",
              "You don't have friends on NutriConnect yet.",
              "Aún no tienes amigos en NutriConnect.",
              "Vous n'avez pas encore d'amis sur NutriConnect.",
            ])}{" "}
            <Link to="/explorar" className="font-semibold text-primary hover:underline">
              {tr([
                "Encontrar pessoas",
                "Find people",
                "Encontrar personas",
                "Trouver des personnes",
              ])}
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={picked.includes(f.id)}
                onClick={() => toggle(f.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition",
                  picked.includes(f.id)
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Face name={f.name} url={f.avatarUrl} size={28} />
                {f.name.split(" ")[0]}
                {picked.includes(f.id) && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-foreground">
          {tr(["Nome (opcional)", "Name (optional)", "Nombre (opcional)", "Nom (facultatif)"])}
        </span>
        <input
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr([
            "Ex.: Turma da água",
            "E.g. Water crew",
            "Ej.: Equipo del agua",
            "Ex. : L'équipe de l'eau",
          ])}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btnSoft} onClick={onClose}>
          {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={!picked.length || create.isPending}
          onClick={submit}
        >
          {tr(["Convidar", "Invite", "Invitar", "Inviter"])}
        </button>
      </div>
    </div>
  );
}
