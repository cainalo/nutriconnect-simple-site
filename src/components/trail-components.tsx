import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  Brain,
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  ShoppingBasket,
  Star,
  Target,
  Users,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import type { RemoteChallenge } from "@/lib/social/challenges";
import type { RemoteCommunity } from "@/lib/social/communities";
import { Mascot, type MascotMood } from "@/components/mascots";
import {
  ACHIEVEMENTS,
  CHARACTERS,
  getTrailSummary,
  type CharacterId,
  type ProfileKind,
  type Trail,
  type TrailProgress,
} from "@/lib/learning-trail";
import { burstFrom } from "@/lib/confetti";
import { useI18n } from "@/hooks/use-i18n";
import { LEVEL_LABEL_KEYS } from "@/lib/i18n/content";
import type { DictKey } from "@/lib/i18n";
import { EmojiIcon } from "@/components/emoji-icon";

/* ------------------------------ Cabeçalho ------------------------------ */

interface TrailHeaderProps {
  xp: number;
  level: number;
  label: string;
  xpInLevel: number;
  xpForNext: number;
  streak: number;
  dailyXP: number;
  dailyGoal: number;
  stars: number;
  maxStars: number;
  goldStops: number;
  totalStops: number;
  levelsDone: number;
  totalLevels: number;
  variant: ProfileKind;
  /** Nome de quem está estudando (perfil ativo). */
  name: string;
  /** Seletor de perfis, exibido no topo do painel. */
  profileSlot?: React.ReactNode;
}

function guideMessage(p: TrailHeaderProps, t: (key: DictKey) => string) {
  const left = String(p.dailyGoal - p.dailyXP);
  if (p.variant === "adult") {
    if (p.levelsDone === 0) return t("tc.adult.start").replace("{name}", p.name);
    if (p.dailyXP >= p.dailyGoal) return t("tc.adult.goalDone");
    if (p.dailyXP === 0) return t("tc.adult.zero");
    return t("tc.adult.left").replace("{n}", left);
  }
  if (p.levelsDone === 0) return t("tc.kid.start").replace("{name}", p.name);
  if (p.dailyXP >= p.dailyGoal) return t("tc.kid.goalDone");
  if (p.dailyXP === 0) return t("tc.kid.zero");
  return t("tc.kid.left").replace("{n}", left);
}

export function TrailHeader(props: TrailHeaderProps) {
  const { t } = useI18n();
  const goalDone = props.dailyXP >= props.dailyGoal;
  const mood: MascotMood = goalDone ? "cheer" : "talk";
  const kid = props.variant === "kid";
  const pct =
    props.xpForNext > 0
      ? Math.min(100, Math.round((props.xpInLevel / props.xpForNext) * 100))
      : 100;
  const levelName = LEVEL_LABEL_KEYS[props.label] ? t(LEVEL_LABEL_KEYS[props.label]) : props.label;
  const stats: { icon: LucideIcon; label: string; value: string; on: boolean }[] = [
    {
      icon: Flame,
      label: t("tc.streak"),
      value: `${props.streak} ${props.streak === 1 ? t("tc.day") : t("tc.days")}`,
      on: props.streak > 0,
    },
    {
      icon: goalDone ? CheckCircle2 : Target,
      label: t("tc.dailyGoal"),
      value: `${Math.min(props.dailyXP, props.dailyGoal)}/${props.dailyGoal}`,
      on: goalDone,
    },
    {
      icon: Star,
      label: t("tc.stars"),
      value: `${props.stars}/${props.maxStars}`,
      on: props.stars > 0,
    },
    {
      icon: Crown,
      label: t("tc.gold"),
      value: `${props.goldStops}/${props.totalStops}`,
      on: props.goldStops > 0,
    },
  ];

  return (
    <section
      className={`mb-8 border border-border bg-card p-5 shadow-sm sm:p-6 ${kid ? "rounded-[2rem]" : "rounded-2xl"}`}
    >
      <div className="grid gap-4 md:grid-cols-[1fr_17rem] md:items-end">
        <div className="flex items-end gap-3">
          <Mascot id="nina" mood={mood} size={64} className="shrink-0" />
          <p
            className={`mb-1 flex-1 rounded-2xl rounded-bl-none bg-secondary/60 px-4 py-2.5 text-left text-sm leading-snug text-foreground ${
              kid ? "font-semibold" : "font-medium"
            }`}
          >
            {guideMessage(props, t)}
          </p>
        </div>
        {props.profileSlot && (
          <div className="[&>button]:w-full [&>button>*:last-child]:ml-auto">
            {props.profileSlot}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-base font-bold text-foreground">
            {t("hub.level").replace("{n}", String(props.level))}
            <span className="text-sm font-medium text-muted-foreground"> · {levelName}</span>
          </p>
          <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
            {props.xp} XP
          </span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
        <p className="mt-1.5 text-left text-xs text-muted-foreground">
          {t("tc.missingXp").replace("{n}", String(Math.max(props.xpForNext - props.xpInLevel, 0)))}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <st.icon className={`h-3.5 w-3.5 ${st.on ? "text-accent" : ""}`} />
              {st.label}
            </dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-foreground">{st.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* --------------------------------- Herói --------------------------------- */

const HERO_CAST: CharacterId[] = ["lipe", "nina", "mila", "tito", "cadu"];
const HERO_FLOATERS = [
  { e: "🍎", l: 6, d: 0, t: 9 },
  { e: "🥕", l: 22, d: -3, t: 11 },
  { e: "🍊", l: 40, d: -6, t: 10 },
  { e: "🥦", l: 58, d: -2, t: 12 },
  { e: "🍋", l: 76, d: -8, t: 9 },
  { e: "🍇", l: 92, d: -4, t: 11 },
];

/** Faixa de boas-vindas. No perfil adulto é sóbria, com a Nina em destaque; no infantil, os Nutri-Amigos. */
export function TrailHero({ variant, name }: { variant: ProfileKind; name: string }) {
  const { t } = useI18n();
  const [cheering, setCheering] = useState<CharacterId | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cheer = (id: CharacterId, el: Element, palette?: string[]) => {
    setCheering(id);
    burstFrom(el, palette ?? ["#facc15", "#fb923c", "#4ade80", "#38bdf8", "#f472b6"]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCheering(null), 1300);
  };

  if (variant === "adult") {
    return (
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-10 -top-16 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(rgb(255 255 255 / 0.18) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
        <div className="relative flex flex-col items-center justify-between gap-4 lg:flex-row">
          <div className="max-w-xl space-y-3 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest backdrop-blur-sm">
              <FlaskConical className="h-3.5 w-3.5" /> {t("tc.hero.badge")}
            </span>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              {t("tc.hero.title")}
            </h2>
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">
              {t("tc.hero.text")}
            </p>
            <p className="text-xs text-white/60">{t("tc.hero.hint")}</p>
          </div>
          <button
            type="button"
            onClick={(e) =>
              cheer("nina", e.currentTarget, ["#fde047", "#34d399", "#ffffff", "#93c5fd"])
            }
            aria-label={t("tc.hero.greetNina")}
            className="-mb-6 shrink-0 cursor-pointer self-end transition-transform hover:-translate-y-1 active:scale-95 lg:-mr-2"
          >
            <Mascot
              key={cheering === "nina" ? "cheer" : "idle"}
              id="nina"
              mood={cheering === "nina" ? "cheer" : "talk"}
              size={190}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-[#2f6f8f] p-6 text-white shadow-xl sm:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-12 left-10 h-44 w-44 rounded-full bg-pink-400/25 blur-3xl" />
        {HERO_FLOATERS.map((f, i) => (
          <span
            key={i}
            className="nc-fall absolute top-0 text-white/85 opacity-0"
            style={{ left: `${f.l}%`, animationDelay: `${f.d}s`, animationDuration: `${f.t}s` }}
          >
            <EmojiIcon emoji={f.e} className="h-6 w-6" />
          </span>
        ))}
      </div>

      <div className="relative flex flex-col items-center justify-between gap-6 lg:flex-row">
        <div className="max-w-xl space-y-2 text-center lg:text-left">
          <p className="text-base font-extrabold text-white/90">
            {t("tc.kid.hello").replace("{name}", name)}
          </p>
          <h2 className="font-display text-3xl font-black text-white drop-shadow-sm sm:text-4xl">
            {t("tc.kid.title")}
          </h2>
          <p className="text-sm font-medium leading-relaxed text-white/90 sm:text-base">
            {t("tc.kid.text")}
          </p>
        </div>

        <div className="flex items-end justify-center -space-x-2 sm:space-x-1">
          {HERO_CAST.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={(e) => cheer(id, e.currentTarget)}
              title={`${CHARACTERS[id].name}: ${t(`ch.role.${id}` as DictKey)}`}
              aria-label={`${t("tc.greet")} ${CHARACTERS[id].name}`}
              className="cursor-pointer transition-transform hover:-translate-y-1.5 active:scale-95"
              style={{ zIndex: i === 1 ? 2 : 1 }}
            >
              <Mascot
                key={cheering === id ? "cheer" : "idle"}
                id={id}
                mood={cheering === id ? "cheer" : "idle"}
                size={i === 1 ? 92 : 76}
                style={{ animationDelay: `${i * 0.35}s` }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ADULT_TRAIL_ICONS: Record<string, LucideIcon> = {
  nutrientes: FlaskConical,
  escolhas: ShoppingBasket,
  "bem-estar": Brain,
};

/** Trilhas com foto em public/images/trail (recortes do banco de fotos do site; créditos lá). */
const TRAIL_PHOTOS = new Set(["nutrientes", "escolhas", "bem-estar", "kid-sabores", "kid-corpo"]);

/** Escolha do grande tema (trilha) a estudar. */
export function TrailPicker({
  trails,
  progress,
  selectedId,
  onSelect,
  variant,
}: {
  trails: Trail[];
  progress: TrailProgress;
  selectedId: string;
  onSelect: (id: string) => void;
  variant: ProfileKind;
}) {
  const { t } = useI18n();
  const adult = variant === "adult";
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">
          {adult ? t("tc.pickTheme") : t("tc.pickAdventure")}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {trails.length} {adult ? t("tc.trailsWord") : t("tc.adventuresWord")}
        </span>
      </div>
      <div className={`grid gap-4 ${trails.length > 2 ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
        {trails.map((trail) => {
          const sum = getTrailSummary(progress, trail);
          const selected = trail.id === selectedId;
          const Icon = ADULT_TRAIL_ICONS[trail.id] ?? FlaskConical;
          return (
            <button
              key={trail.id}
              type="button"
              onClick={() => onSelect(trail.id)}
              aria-pressed={selected}
              className={`group relative cursor-pointer overflow-hidden border-2 p-5 text-left transition-all ${
                adult ? "rounded-2xl" : "rounded-[1.75rem]"
              } ${
                selected
                  ? "border-primary bg-primary-soft/40 shadow-md"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              }`}
            >
              {TRAIL_PHOTOS.has(trail.id) && (
                <span className="relative -mx-5 -mt-5 mb-4 block h-28 overflow-hidden">
                  <img
                    src={`/images/trail/${trail.id}.jpg`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  />
                </span>
              )}
              <div className="flex items-start gap-3.5">
                {adult ? (
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/70 text-primary shadow-inner dark:bg-white/10">
                    <span className={selected ? "nc-bob" : ""}>
                      <EmojiIcon emoji={trail.icon} className="h-7 w-7" />
                    </span>
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold leading-tight text-foreground">
                    {trail.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {trail.tagline}
                  </p>
                </div>
                {sum.gold === sum.stops && sum.stops > 0 && (
                  <Crown className="h-5 w-5 shrink-0 fill-yellow-400 text-yellow-500" />
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {trail.description}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                      adult ? "bg-primary" : "nc-stripes bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(sum.pct, sum.pct > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                  {sum.pct}%
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                {t("tc.stopsGold")
                  .replace("{stops}", String(sum.stops))
                  .replace("{gold}", String(sum.gold))}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- Conquistas ------------------------------- */

export function TrailAchievements({ unlocked }: { unlocked: string[] }) {
  const { t } = useI18n();
  const count = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).length;
  return (
    <div className="mb-8 rounded-[2rem] border-2 border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-black text-foreground">
          <Award className="h-5 w-5 text-accent" aria-hidden="true" />
          {t("tc.achievementsTitle")}
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          {count}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const has = unlocked.includes(a.id);
          return (
            <div
              key={a.id}
              title={t(`ach.${a.id}.desc` as DictKey)}
              className={`group flex items-center gap-3 rounded-2xl border-2 p-3 transition ${
                has
                  ? "border-amber-400/50 bg-gradient-to-br from-amber-100/70 to-yellow-100/40 hover:-translate-y-0.5 hover:shadow-md dark:from-amber-500/15 dark:to-yellow-500/10"
                  : "border-border bg-secondary/30"
              }`}
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${
                  has ? "bg-white/70 shadow-inner dark:bg-white/10" : "bg-secondary"
                }`}
              >
                {has ? (
                  <EmojiIcon emoji={a.icon} className="h-6 w-6 text-amber-500" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground/60" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-left text-xs font-black leading-tight ${has ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {t(`ach.${a.id}.title` as DictKey)}
                </p>
                <p className="mt-0.5 line-clamp-3 text-left text-[11px] font-medium leading-snug text-muted-foreground">
                  {t(`ach.${a.id}.desc` as DictKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Desafios ------------------------------ */

export function PopularBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
      <Flame className="nc-flame h-3 w-3" /> {t("tc.popular")}
    </span>
  );
}

interface CommunityChallengeGroupProps {
  community: RemoteCommunity;
  challenges: RemoteChallenge[];
}

export function CommunityChallengeGroup({ community, challenges }: CommunityChallengeGroupProps) {
  const { t } = useI18n();
  return (
    <div className="rounded-[2rem] border-2 border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="nc-wobble grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary shadow-inner">
          <EmojiIcon emoji="👥" className="h-7 w-7" />
        </div>
        <div>
          <Link
            to="/comunidades/$slug"
            params={{ slug: community.slug }}
            className="font-display text-lg font-black text-foreground transition hover:text-accent"
          >
            {community.name}
          </Link>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("tc.membersChallenges")
              .replace("{members}", String(community.memberCount))
              .replace("{n}", String(challenges.length))
              .replace("{word}", challenges.length === 1 ? t("tc.challenge") : t("tc.challenges"))}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {challenges.map((c) => {
          const isCompleted = c.completed;
          const isJoined = c.joined;
          const totalSteps = c.steps.length;
          const completedSteps = c.mySteps.length;
          const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

          return (
            <Link
              key={c.id}
              to="/desafios/$challengeId"
              params={{ challengeId: c.id }}
              className={`flex items-center gap-4 rounded-2xl border-2 p-4 transition-all hover:-translate-y-1 hover:shadow-md ${
                isCompleted
                  ? "border-primary/40 bg-primary-soft/20"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${
                  isCompleted
                    ? "border-2 border-primary-hover bg-primary shadow-inner"
                    : "border-2 border-border bg-secondary"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-white" />
                ) : (
                  <EmojiIcon emoji={c.badgeIcon} className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-foreground">{c.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {c.participantCount} · {c.duration}
                </p>
                {isJoined && !isCompleted && totalSteps > 0 && (
                  <div className="mt-2">
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
