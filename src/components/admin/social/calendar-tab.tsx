// Calendário editorial do estúdio, no estilo da página de Funções: o mês em cards (posts com a cor do
// status e o ícone da rede, datas de saúde em destaque), o dia de hoje marcado e um "+" para criar
// post já com a data. No celular vira uma agenda (só os dias com algo). Ao lado: posts sem data e as
// datas de saúde do mês.
import { useState } from "react";
import {
  CalendarDays,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Megaphone,
  Plus,
} from "lucide-react";
import { EmptyState, IconBadge, StudioCard } from "@/components/admin/social/kit";
import {
  NETWORK_STYLE,
  STATUS_STYLE,
  btnIcon,
  btnSoft,
  tint,
} from "@/components/admin/social/kit-styles";
import { PostThumb } from "@/components/admin/social/template-thumb";
import { HEALTH_DATES, type HealthDate } from "@/lib/social-calendar";
import {
  FORMAT_LABEL,
  STATUSES,
  STATUS_LABEL,
  useSocialPosts,
  type PostStatus,
  type SocialPost,
} from "@/lib/social-studio";
import type { Network, PostFormat } from "@/lib/social-studio.functions";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import type { Names } from "@/lib/appearance-data";

const WEEK: Names[] = [
  ["Dom", "Sun", "Dom", "Dim"],
  ["Seg", "Mon", "Lun", "Lun"],
  ["Ter", "Tue", "Mar", "Mar"],
  ["Qua", "Wed", "Mié", "Mer"],
  ["Qui", "Thu", "Jue", "Jeu"],
  ["Sex", "Fri", "Vie", "Ven"],
  ["Sáb", "Sat", "Sáb", "Sam"],
];
const PINK = "#d6456b";
const pad = (n: number) => String(n).padStart(2, "0");

export function CalendarTab({
  onOpen,
  onNew,
}: {
  onOpen: (p: SocialPost) => void;
  /** Novo post já com a data do dia. */
  onNew?: (date: string) => void;
}) {
  const tr = useTr();
  const { locale } = useI18n();
  const posts = useSocialPosts();
  const today = new Date();
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const first = new Date(cursor.y, cursor.m, 1);
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = first.getDay();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const list = (posts.data ?? []).filter((p) => !p.is_template);
  const byDay = new Map<number, SocialPost[]>();
  for (const p of list) {
    if (!p.scheduled_for) continue;
    const [y, m, d] = p.scheduled_for.split("-").map(Number);
    if (y === cursor.y && m === cursor.m + 1) byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }
  const dates = HEALTH_DATES.filter((d) => d.month === cursor.m + 1);
  const monthCampaigns = dates.filter((d) => !d.day);
  const datesOf = (d: number) => dates.filter((x) => x.day === d);
  const unscheduled = list.filter((p) => !p.scheduled_for && p.status !== "publicado");
  const isThisMonth = today.getFullYear() === cursor.y && today.getMonth() === cursor.m;
  const isToday = (d: number) => isThisMonth && today.getDate() === d;
  const isPast = (d: number) =>
    new Date(cursor.y, cursor.m, d) <
    new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayIso = (d: number) => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`;
  const move = (n: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const monthLabel = first.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const monthName = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const scheduledCount = [...byDay.values()].reduce((s, l) => s + l.length, 0);
  // Agenda do celular: só os dias com post ou data de saúde.
  const agenda = Array.from({ length: days }, (_, i) => i + 1).filter(
    (d) => byDay.has(d) || datesOf(d).length > 0 || isToday(d),
  );

  return (
    <div className="@container min-w-0">
      <div className="grid min-w-0 gap-4 @5xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          className="nc-tile-in min-w-0 rounded-[1.6rem] border p-3 shadow-xs @2xl:p-4"
          style={{
            background: `linear-gradient(160deg, ${tint(PINK, 9)} 0%, var(--card) 40%)`,
            borderColor: `color-mix(in srgb, ${PINK} 20%, var(--border))`,
          }}
        >
          <header className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
            <IconBadge icon={CalendarDays} color={PINK} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-xl font-bold leading-tight text-foreground">
                {monthName}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {scheduledCount === 0
                  ? tr([
                      "Nenhum post com data neste mês",
                      "No posts scheduled this month",
                      "Ningún post con fecha este mes",
                      "Aucun post daté ce mois-ci",
                    ])
                  : scheduledCount === 1
                    ? tr(["1 post com data", "1 scheduled post", "1 post con fecha", "1 post daté"])
                    : `${scheduledCount} ${tr(["posts com data", "scheduled posts", "posts con fecha", "posts datés"])}`}
                {dates.length > 0 &&
                  ` · ${dates.length} ${tr(["datas de saúde", "health dates", "fechas de salud", "dates santé"])}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!isThisMonth && (
                <button
                  type="button"
                  className={cn(btnSoft, "h-9 px-3 text-xs")}
                  onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
                >
                  {tr(["Hoje", "Today", "Hoy", "Aujourd’hui"])}
                </button>
              )}
              <button
                type="button"
                className={cn(btnIcon, "border border-border/70 bg-card")}
                onClick={() => move(-1)}
                aria-label={tr([
                  "Mês anterior",
                  "Previous month",
                  "Mes anterior",
                  "Mois précédent",
                ])}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={cn(btnIcon, "border border-border/70 bg-card")}
                onClick={() => move(1)}
                aria-label={tr(["Próximo mês", "Next month", "Mes siguiente", "Mois suivant"])}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </header>

          {monthCampaigns.length > 0 && (
            <div className="mb-3 flex min-w-0 flex-wrap gap-1.5">
              {monthCampaigns.map((d) => (
                <span
                  key={d.title}
                  title={d.angle}
                  className="inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: tint(PINK, 14), color: PINK }}
                >
                  <Megaphone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{d.title}</span>
                </span>
              ))}
            </div>
          )}

          {/* Mês em grade (telas médias e grandes) */}
          <div className="hidden @2xl:block">
            <div className="grid grid-cols-7 gap-1.5 pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {WEEK.map((w) => (
                <span key={w[0]}>{tr(w)}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d, i) => {
                const inMonth = d >= 1 && d <= days;
                if (!inMonth) return <div key={i} aria-hidden="true" />;
                const special = datesOf(d);
                const items = byDay.get(d) ?? [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "group relative flex min-h-[6.5rem] min-w-0 flex-col gap-1 rounded-2xl border p-1.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                      isPast(d) && !isToday(d) && "opacity-70",
                    )}
                    style={{
                      background: special.length ? tint(PINK, 7) : "var(--card)",
                      borderColor: isToday(d)
                        ? PINK
                        : `color-mix(in srgb, var(--border) 70%, transparent)`,
                      boxShadow: isToday(d) ? `0 0 0 1px ${PINK}` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] font-bold",
                          isToday(d) ? "text-white" : "text-muted-foreground",
                        )}
                        style={isToday(d) ? { background: PINK } : undefined}
                      >
                        {d}
                      </span>
                      {onNew && (
                        <button
                          type="button"
                          onClick={() => onNew(dayIso(d))}
                          className="grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground opacity-0 shadow-sm transition focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`${tr(["Novo post em", "New post on", "Nuevo post el", "Nouveau post le"])} ${d}/${cursor.m + 1}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {special.map((s) => (
                      <HealthChip key={s.title} date={s} />
                    ))}
                    {items.slice(0, 3).map((p) => (
                      <PostChip key={p.id} post={p} onOpen={() => onOpen(p)} />
                    ))}
                    {items.length > 3 && (
                      <span className="px-1 text-[10px] font-semibold text-muted-foreground">
                        +{items.length - 3} posts
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda (celular) */}
          <div className="@2xl:hidden">
            {agenda.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                {tr([
                  "Nada marcado neste mês. Abra um post e escolha a data.",
                  "Nothing scheduled this month. Open a post and pick a date.",
                  "Nada programado este mes. Abre un post y elige la fecha.",
                  "Rien de prévu ce mois-ci. Ouvrez un post et choisissez la date.",
                ])}
              </p>
            ) : (
              <ol className="space-y-2">
                {agenda.map((d) => {
                  const date = new Date(cursor.y, cursor.m, d);
                  return (
                    <li
                      key={d}
                      className="flex min-w-0 gap-3 rounded-2xl border bg-card p-2.5"
                      style={{
                        borderColor: isToday(d)
                          ? PINK
                          : `color-mix(in srgb, var(--border) 70%, transparent)`,
                      }}
                    >
                      <div
                        className={cn(
                          "grid h-12 w-12 shrink-0 place-content-center rounded-xl text-center leading-none",
                          isToday(d) ? "text-white" : "text-foreground",
                        )}
                        style={{ background: isToday(d) ? PINK : tint(PINK, 10) }}
                      >
                        <span className="text-lg font-bold">{d}</span>
                        <span className="mt-0.5 text-[9px] font-bold uppercase">
                          {tr(WEEK[date.getDay()])}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        {datesOf(d).map((s) => (
                          <HealthChip key={s.title} date={s} />
                        ))}
                        {(byDay.get(d) ?? []).map((p) => (
                          <PostChip key={p.id} post={p} onOpen={() => onOpen(p)} />
                        ))}
                        {isToday(d) && !byDay.has(d) && datesOf(d).length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            {tr([
                              "Hoje, sem posts",
                              "Today, no posts",
                              "Hoy, sin posts",
                              "Aujourd’hui, aucun post",
                            ])}
                          </span>
                        )}
                      </div>
                      {onNew && (
                        <button
                          type="button"
                          onClick={() => onNew(dayIso(d))}
                          className="grid h-8 w-8 shrink-0 place-items-center self-center rounded-full bg-accent text-accent-foreground shadow-sm"
                          aria-label={`${tr(["Novo post em", "New post on", "Nuevo post el", "Nouveau post le"])} ${d}/${cursor.m + 1}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-semibold text-muted-foreground">
            {STATUSES.map((s) => {
              const st = STATUS_STYLE[s];
              return (
                <span key={s} className="inline-flex items-center gap-1">
                  <st.icon className="h-3.5 w-3.5" style={{ color: st.color }} />
                  {STATUS_LABEL[s]}
                </span>
              );
            })}
            <span className="inline-flex items-center gap-1">
              <CalendarHeart className="h-3.5 w-3.5" style={{ color: PINK }} />{" "}
              {tr(["Data de saúde", "Health date", "Fecha de salud", "Date santé"])}
            </span>
          </div>
        </section>

        <div className="min-w-0 space-y-4">
          <StudioCard
            icon={Inbox}
            color="#3b7bbf"
            title={`${tr(["Sem data", "No date", "Sin fecha", "Sans date"])} (${unscheduled.length})`}
            hint={tr([
              "Abra um post e escolha a data",
              "Open a post and pick a date",
              "Abre un post y elige la fecha",
              "Ouvrez un post et choisissez la date",
            ])}
            delay={80}
          >
            {unscheduled.length === 0 ? (
              <EmptyState
                icon={Inbox}
                color="#3b7bbf"
                title={tr([
                  "Tudo planejado",
                  "All planned",
                  "Todo planificado",
                  "Tout est planifié",
                ])}
                text={tr([
                  "Todos os posts em andamento já têm data.",
                  "All posts in progress already have a date.",
                  "Todos los posts en curso ya tienen fecha.",
                  "Tous les posts en cours ont déjà une date.",
                ])}
              />
            ) : (
              <ul className="st-thin max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
                {unscheduled.slice(0, 40).map((p) => {
                  const st = STATUS_STYLE[p.status as PostStatus] ?? STATUS_STYLE.rascunho;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(p)}
                        className="flex w-full min-w-0 items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <span className="w-10 shrink-0 overflow-hidden rounded-lg">
                          <PostThumb post={p} className="aspect-[4/5] w-full" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {p.title || tr(["Sem título", "Untitled", "Sin título", "Sans titre"])}
                          </span>
                          <span
                            className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold"
                            style={{ color: st.color }}
                          >
                            <st.icon className="h-3 w-3" />
                            {STATUS_LABEL[p.status as PostStatus]}
                            <span className="font-medium text-muted-foreground">
                              · {FORMAT_LABEL[p.format as PostFormat]}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </StudioCard>

          {dates.length > 0 && (
            <StudioCard
              icon={CalendarHeart}
              color={PINK}
              title={tr([
                "Datas de saúde do mês",
                "Health dates this month",
                "Fechas de salud del mes",
                "Dates santé du mois",
              ])}
              hint={tr([
                "Ganchos para posts",
                "Hooks for posts",
                "Ganchos para posts",
                "Accroches pour des posts",
              ])}
              delay={140}
            >
              <ul className="space-y-2">
                {dates.map((d) => (
                  <li key={d.title} className="flex min-w-0 gap-2.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold"
                      style={{ background: tint(PINK, 14), color: PINK }}
                    >
                      {d.day ? pad(d.day) : <Megaphone className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-foreground">{d.title}</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {d.angle}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </StudioCard>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthChip({ date }: { date: HealthDate }) {
  return (
    <span
      title={date.angle}
      className="flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold leading-tight"
      style={{ background: tint(PINK, 16), color: PINK }}
    >
      <CalendarHeart className="h-3 w-3 shrink-0" />
      <span className="truncate">{date.title}</span>
    </span>
  );
}

function PostChip({ post, onOpen }: { post: SocialPost; onOpen: () => void }) {
  const tr = useTr();
  const st = STATUS_STYLE[post.status as PostStatus] ?? STATUS_STYLE.rascunho;
  const net = NETWORK_STYLE[post.network as Network] ?? NETWORK_STYLE.outro;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${FORMAT_LABEL[post.format as PostFormat]} · ${STATUS_LABEL[post.status as PostStatus]}`}
      className="flex w-full min-w-0 items-center gap-1 rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[10px] font-semibold leading-tight text-foreground transition hover:brightness-95"
      style={{ background: tint(st.color, 12), borderLeftColor: st.color }}
    >
      <net.icon className="h-3 w-3 shrink-0" style={{ color: net.color }} />
      <span className="truncate">
        {post.title || tr(["Sem título", "Untitled", "Sin título", "Sans titre"])}
      </span>
    </button>
  );
}
