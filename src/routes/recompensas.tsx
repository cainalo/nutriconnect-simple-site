// X4 — Pontos e recompensas: saldo, como ganhar, troca por recompensas, códigos e histórico.
import { useState } from "react";
import { friendlyError } from "@/lib/friendly-error";
import { METRICS, useLeague, useMyFriendChallenges, weekStartOf } from "@/lib/friend-challenges";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarCheck,
  Check,
  Copy,
  Gift,
  Loader2,
  Sparkles,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import {
  usePointsHistory,
  useMyRedemptions,
  useRedeem,
  useRewardBalance,
  useRewards,
  useWeekPreview,
  type Redemption,
  type Reward,
} from "@/lib/rewards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recompensas")({
  head: () => ({ meta: [{ title: "Pontos e recompensas — NutriConnect" }] }),
  component: RewardsPage,
});

const card = "rounded-3xl border border-border/70 bg-card p-5 shadow-xs";
const btnPrimary =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
// Botão que ainda não dá para usar (faltam pontos, esgotado): texto escuro em fundo neutro, legível.
const btnWaiting =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-secondary px-4 py-2 text-xs font-semibold text-foreground cursor-not-allowed";
const btnSoft =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";

function RewardsPage() {
  const tr = useTr();
  const { user } = useAuth();
  const balance = useRewardBalance(!!user);
  const preview = useWeekPreview(!!user);
  const points = balance.data ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1
          data-page-head
          className="flex items-center gap-2 text-2xl font-extrabold font-display text-foreground"
        >
          <Gift className="h-6 w-6 text-accent" />
          {tr([
            "Pontos e recompensas",
            "Points and rewards",
            "Puntos y recompensas",
            "Points et récompenses",
          ])}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {tr([
            "Cuidar de si vale pontos. Toda segunda-feira os pontos da semana entram, e você troca por recompensas.",
            "Taking care of yourself earns points. Every Monday the week's points come in, and you trade them for rewards.",
            "Cuidarte vale puntos. Cada lunes entran los puntos de la semana y los cambias por recompensas.",
            "Prendre soin de soi rapporte des points. Chaque lundi, ceux de la semaine arrivent et vous les échangez contre des récompenses.",
          ])}
        </p>
      </header>

      <section className={cn(card, "grid items-center gap-4 sm:grid-cols-2")}>
        <div className="nc-rise text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {tr(["Seu saldo", "Your balance", "Tu saldo", "Votre solde"])}
          </p>
          <p className="font-display text-5xl font-extrabold text-foreground">
            {balance.isLoading ? "…" : points}
          </p>
          <p className="text-xs text-muted-foreground">
            {tr(["pontos", "points", "puntos", "points"])}
          </p>
        </div>
        <div className="nc-rise rounded-2xl bg-accent/10 p-4" style={{ animationDelay: "80ms" }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            {tr(["Nesta semana", "This week", "Esta semana", "Cette semaine"])}
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold text-foreground">
            +{preview.data ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {tr([
              "Entram no saldo na segunda-feira.",
              "Added to your balance on Monday.",
              "Entran al saldo el lunes.",
              "Ajoutés à votre solde lundi.",
            ])}
          </p>
          {user && <WeekBreakdown />}
        </div>
      </section>

      <HowToEarn />
      <Catalog balance={points} />
      {user && <MyCodes userId={user.id} />}
      {user && <History userId={user.id} />}
    </div>
  );
}

function HowToEarn() {
  const tr = useTr();
  const items = [
    {
      icon: CalendarCheck,
      title: tr([
        "10 pontos por dia",
        "10 points a day",
        "10 puntos por día",
        "10 points par jour",
      ]),
      text: tr([
        "Para cada meta do dia: água, verduras, comida de casa, movimento, refeição com calma e trilha.",
        "For each daily goal: water, vegetables, home cooking, movement, mindful meal and learning path.",
        "Por cada meta del día: agua, verduras, comida casera, movimiento, comida con calma y ruta.",
        "Pour chaque objectif du jour : eau, légumes, fait maison, bouger, repas calme et parcours.",
      ]),
    },
    {
      icon: Users,
      title: tr(["+50 por desafio", "+50 per challenge", "+50 por desafío", "+50 par défi"]),
      text: tr([
        "Quando você chega à meta de um desafio com amigos.",
        "When you reach the goal of a challenge with friends.",
        "Cuando llegas a la meta de un desafío con amigos.",
        "Quand vous atteignez l'objectif d'un défi entre amis.",
      ]),
    },
    {
      icon: Trophy,
      title: tr(["Toda segunda", "Every Monday", "Cada lunes", "Chaque lundi"]),
      text: tr([
        "Os pontos da semana entram de uma vez, e você recebe um aviso.",
        "The week's points come in at once, and you get a notice.",
        "Los puntos de la semana entran juntos y recibes un aviso.",
        "Les points de la semaine arrivent d'un coup, avec un avis.",
      ]),
    },
  ];
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-bold font-display text-foreground">
        {tr(["Como ganhar", "How to earn", "Cómo ganar", "Comment gagner"])}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, text }, i) => (
          <div
            key={title}
            className={cn(card, "nc-rise")}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <Icon className="h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-bold text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <Link
          to="/desafios"
          search={{ aba: "amigos" }}
          className="font-semibold text-primary hover:underline"
        >
          {tr([
            "Ver a liga e os desafios com amigos",
            "See the league and friends' challenges",
            "Ver la liga y los desafíos con amigos",
            "Voir la ligue et les défis entre amis",
          ])}
        </Link>
      </p>
    </section>
  );
}

function Catalog({ balance }: { balance: number }) {
  const tr = useTr();
  const rewards = useRewards();
  const list = (rewards.data ?? []).filter((r) => r.active);
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold font-display text-foreground">
        {tr(["Recompensas", "Rewards", "Recompensas", "Récompenses"])}
      </h2>
      {rewards.isLoading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      ) : list.length === 0 ? (
        <p className={cn(card, "text-center text-sm text-muted-foreground")}>
          {tr([
            "Nenhuma recompensa disponível agora. Continue juntando pontos!",
            "No rewards available right now. Keep collecting points!",
            "No hay recompensas ahora. ¡Sigue juntando puntos!",
            "Aucune récompense pour le moment. Continuez à cumuler des points !",
          ])}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((r, i) => (
            <RewardCard key={r.id} reward={r} balance={balance} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

function RewardCard({
  reward,
  balance,
  index,
}: {
  reward: Reward;
  balance: number;
  index: number;
}) {
  const tr = useTr();
  const redeem = useRedeem();
  const [confirm, setConfirm] = useState(false);
  const pct = Math.min(100, Math.round((balance / reward.cost) * 100));
  const enough = balance >= reward.cost;
  const soldOut = reward.stock !== null && reward.stock <= 0;

  return (
    <article
      className={cn(card, "nc-rise flex flex-col")}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10">
          {reward.kind === "desconto_programa" ? (
            <Ticket className="h-6 w-6 text-accent" />
          ) : (
            <Gift className="h-6 w-6 text-accent" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-foreground">{reward.title}</h3>
          {reward.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {reward.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto pt-4">
        <div className="flex justify-between text-xs">
          <span className="font-bold text-foreground">
            {reward.cost} {tr(["pontos", "points", "puntos", "points"])}
          </span>
          {reward.stock !== null && (
            <span className="text-muted-foreground">
              {tr([
                `${reward.stock} restantes`,
                `${reward.stock} left`,
                `${reward.stock} restantes`,
                `${reward.stock} restants`,
              ])}
            </span>
          )}
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={tr([
            `${reward.title}: ${pct}% dos pontos`,
            `${reward.title}: ${pct}% of the points`,
            `${reward.title}: ${pct}% de los puntos`,
            `${reward.title} : ${pct} % des points`,
          ])}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              enough ? "bg-primary" : "bg-accent",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {confirm ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={btnSoft} onClick={() => setConfirm(false)}>
              {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={redeem.isPending}
              onClick={() =>
                redeem.mutate(reward.id, {
                  onSuccess: (code) => {
                    toast.success(
                      tr([
                        `Pronto! Seu código: ${code}`,
                        `Done! Your code: ${code}`,
                        `¡Listo! Tu código: ${code}`,
                        `C'est fait ! Votre code : ${code}`,
                      ]),
                    );
                    setConfirm(false);
                  },
                  onError: (e) => toast.error(tr(friendlyError(e))),
                })
              }
            >
              {tr([
                `Trocar ${reward.cost} pontos`,
                `Spend ${reward.cost} points`,
                `Cambiar ${reward.cost} puntos`,
                `Échanger ${reward.cost} points`,
              ])}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={cn(!enough || soldOut ? btnWaiting : btnPrimary, "mt-3 w-full")}
            disabled={!enough || soldOut}
            onClick={() => setConfirm(true)}
          >
            {soldOut
              ? tr(["Esgotado", "Sold out", "Agotado", "Épuisé"])
              : enough
                ? tr(["Trocar", "Redeem", "Cambiar", "Échanger"])
                : tr([
                    `Faltam ${reward.cost - balance} pontos`,
                    `${reward.cost - balance} points to go`,
                    `Faltan ${reward.cost - balance} puntos`,
                    `Encore ${reward.cost - balance} points`,
                  ])}
          </button>
        )}
      </div>
    </article>
  );
}

function MyCodes({ userId }: { userId: string }) {
  const tr = useTr();
  const { locale } = useI18n();
  const mine = useMyRedemptions(userId);
  const list = mine.data ?? [];
  if (!list.length) return null;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(tr(["Código copiado.", "Code copied.", "Código copiado.", "Code copié."]));
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
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold font-display text-foreground">
        {tr(["Meus códigos", "My codes", "Mis códigos", "Mes codes"])}
      </h2>
      <ul className="space-y-2">
        {list.map((r: Redemption) => {
          const expired = r.status === "expirado" || new Date(r.expires_at).getTime() < Date.now();
          const used = r.status === "usado";
          return (
            <li
              key={r.id}
              className={cn(
                card,
                "flex flex-wrap items-center gap-3 p-4",
                (used || expired) && "opacity-60",
              )}
            >
              <Ticket className="h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-sm font-semibold text-foreground">{r.rewards?.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {used
                    ? tr(["Usado", "Used", "Usado", "Utilisé"])
                    : expired
                      ? tr(["Vencido", "Expired", "Vencido", "Expiré"])
                      : tr([
                          `Vale até ${new Date(r.expires_at).toLocaleDateString(locale)}`,
                          `Valid until ${new Date(r.expires_at).toLocaleDateString(locale)}`,
                          `Válido hasta ${new Date(r.expires_at).toLocaleDateString(locale)}`,
                          `Valable jusqu'au ${new Date(r.expires_at).toLocaleDateString(locale)}`,
                        ])}
                  {!used && !expired && r.rewards?.kind === "desconto_programa" && (
                    <>
                      {" · "}
                      <Link to="/programas" className="font-semibold text-primary hover:underline">
                        {tr([
                          "use ao comprar um programa",
                          "use it when buying a program",
                          "úsalo al comprar un programa",
                          "à utiliser lors de l'achat d'un programme",
                        ])}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                className={cn(btnSoft, "min-h-11 font-mono tracking-wider")}
                onClick={() => copy(r.code)}
                aria-label={tr(["Copiar código", "Copy code", "Copiar código", "Copier le code"])}
              >
                {used ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {r.code}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const REASONS: Record<string, [string, string, string, string]> = {
  semana: ["Pontos da semana", "Weekly points", "Puntos de la semana", "Points de la semaine"],
  desafio: [
    "Desafio com amigos cumprido",
    "Friends' challenge done",
    "Desafío con amigos cumplido",
    "Défi entre amis réussi",
  ],
  resgate: [
    "Troca por recompensa",
    "Reward redeemed",
    "Cambio por recompensa",
    "Récompense échangée",
  ],
  estorno: ["Pontos devolvidos", "Points returned", "Puntos devueltos", "Points rendus"],
  ajuste: ["Ajuste da equipe", "Team adjustment", "Ajuste del equipo", "Ajustement de l'équipe"],
};

function History({ userId }: { userId: string }) {
  const tr = useTr();
  const { locale } = useI18n();
  const history = usePointsHistory(userId);
  const [all, setAll] = useState(false);
  const full = history.data ?? [];
  if (!full.length) return null;
  // Os 10 mais recentes; o resto (até 30) com "Ver mais".
  const list = all ? full : full.slice(0, 10);
  return (
    <section className={cn(card, "mt-8")}>
      <h2 className="text-lg font-bold font-display text-foreground">
        {tr(["Histórico", "History", "Historial", "Historique"])}
      </h2>
      <ul className="mt-3 divide-y divide-border/60">
        {list.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                {tr(REASONS[p.reason] ?? REASONS.ajuste)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString(locale)}
                {p.note && ` · ${p.note}`}
              </span>
            </span>
            <span
              className={cn("font-bold", p.delta > 0 ? "text-primary" : "text-muted-foreground")}
            >
              {p.delta > 0 ? `+${p.delta}` : p.delta}
            </span>
          </li>
        ))}
      </ul>
      {full.length > 10 && (
        <button
          type="button"
          className={cn(btnSoft, "mt-3 min-h-10 w-full")}
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
        >
          {all
            ? tr(["Ver menos", "Show less", "Ver menos", "Voir moins"])
            : tr([
                `Ver mais (${full.length - 10})`,
                `Show more (${full.length - 10})`,
                `Ver más (${full.length - 10})`,
                `Voir plus (${full.length - 10})`,
              ])}
        </button>
      )}
    </section>
  );
}

/** De onde vêm os pontos desta semana: dias de cada meta (10 cada) e desafios cumpridos (+50). */
function WeekBreakdown() {
  const tr = useTr();
  const league = useLeague(true);
  const challenges = useMyFriendChallenges(true);
  const me = (league.data ?? []).find((r) => r.is_me);
  const week = weekStartOf();
  const done = (challenges.data ?? []).filter((c) => {
    if (c.my_status !== "aceito" || c.week_start !== week) return false;
    const mine = c.members.find((m) => m.is_me);
    return !!mine && mine.days >= c.target;
  }).length;
  const rows = METRICS.map((m) => ({
    id: m.id,
    name: tr(m.names),
    days: me ? me[m.id] : 0,
  })).filter((r) => r.days > 0);
  if (!rows.length && !done) return null;
  return (
    <details className="mt-3 text-xs">
      <summary className="inline-flex min-h-6 cursor-pointer items-center font-semibold text-primary">
        {tr(["De onde vêm", "Where they come from", "De dónde vienen", "D'où ils viennent"])}
      </summary>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between gap-2 text-foreground">
            <span>
              {r.name} ·{" "}
              {tr([
                `${r.days} ${r.days === 1 ? "dia" : "dias"}`,
                `${r.days} ${r.days === 1 ? "day" : "days"}`,
                `${r.days} ${r.days === 1 ? "día" : "días"}`,
                `${r.days} ${r.days === 1 ? "jour" : "jours"}`,
              ])}
            </span>
            <span className="font-bold">+{r.days * 10}</span>
          </li>
        ))}
        {done > 0 && (
          <li className="flex justify-between gap-2 text-foreground">
            <span>
              {tr([
                `Desafios com amigos · ${done}`,
                `Friends' challenges · ${done}`,
                `Desafíos con amigos · ${done}`,
                `Défis entre amis · ${done}`,
              ])}
            </span>
            <span className="font-bold">+{done * 50}</span>
          </li>
        )}
      </ul>
    </details>
  );
}
