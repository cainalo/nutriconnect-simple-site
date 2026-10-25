// Tendências do estúdio, no estilo da página de Funções: o que está em alta dentro do NutriConnect
// (só conteúdo público), o tema da semana, as datas de saúde e os alimentos da estação. A IA cruza
// tudo isso e devolve oportunidades, que viram ideias com um toque.
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarHeart,
  Flame,
  Hash,
  Heart,
  Leaf,
  Lightbulb,
  Megaphone,
  MessageCircle,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { EmptyState, StudioCard } from "@/components/admin/social/kit";
import { badgeBg, btnPrimary, tint } from "@/components/admin/social/kit-styles";
import { useI18n } from "@/hooks/use-i18n";
import { useTr } from "@/components/settings-ui";
import { upcomingHealthDates } from "@/lib/social-calendar";
import { seasonNamesPt } from "@/lib/season-data";
import { useInternalTrends } from "@/lib/social-studio";
import { socialTrendsBrief, type TrendOpportunity } from "@/lib/social-studio.functions";
import { cn } from "@/lib/utils";

const GREEN = "#2f8a5b";
const OP_COLORS = ["#2f8a5b", "#d9692a", "#5b6fd6", "#d6456b", "#0f9aa8", "#c58a12"];
const MEDAL = ["#c58a12", "#8a94a6", "#b4532a"];

export function TrendsTab({ onCreate }: { onCreate: (theme: string) => void }) {
  const { locale } = useI18n();
  const tr = useTr();
  const trends = useInternalTrends();
  const [busy, setBusy] = useState(false);
  const [ops, setOps] = useState<TrendOpportunity[]>([]);
  const dates = upcomingHealthDates();
  const season = seasonNamesPt("SE").slice(0, 20);
  const t = trends.data;
  const maxTag = Math.max(1, ...(t?.top_tags ?? []).map((x) => x.n));

  const brief = async () => {
    setBusy(true);
    try {
      const res = await socialTrendsBrief({
        data: { network: "instagram", locale: locale as never },
      });
      if ("error" in res)
        toast.error(
          res.error === "limit"
            ? tr([
                "A cota de IA de hoje acabou.",
                "Today’s AI quota is used up.",
                "La cuota de IA de hoy se agotó.",
                "Le quota d’IA du jour est épuisé.",
              ])
            : tr([
                "A IA não conseguiu responder agora.",
                "The AI couldn’t answer right now.",
                "La IA no pudo responder ahora.",
                "L’IA n’a pas pu répondre pour le moment.",
              ]),
        );
      else if (res.opportunities.length === 0)
        toast.error(
          tr([
            "A IA não encontrou oportunidades agora. Tente mais tarde.",
            "The AI didn’t find any opportunities right now. Try again later.",
            "La IA no encontró oportunidades ahora. Inténtalo más tarde.",
            "L’IA n’a trouvé aucune opportunité pour le moment. Réessayez plus tard.",
          ]),
        );
      else setOps(res.opportunities);
    } catch {
      toast.error(
        tr([
          "A IA não conseguiu responder agora.",
          "The AI couldn’t answer right now.",
          "La IA no pudo responder ahora.",
          "L’IA n’a pas pu répondre pour le moment.",
        ]),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="@container min-w-0 space-y-4">
      <StudioCard
        icon={Lightbulb}
        color={GREEN}
        title={tr([
          "Oportunidades da semana",
          "Opportunities of the week",
          "Oportunidades de la semana",
          "Opportunités de la semaine",
        ])}
        hint={tr([
          "A IA cruza o que está em alta no NutriConnect, o calendário de saúde e a estação",
          "The AI combines what’s trending on NutriConnect, the health calendar and the season",
          "La IA cruza lo que está en tendencia en NutriConnect, el calendario de salud y la temporada",
          "L’IA croise ce qui est tendance sur NutriConnect, le calendrier santé et la saison",
        ])}
        right={
          <button
            type="button"
            className={cn(btnPrimary, "h-9 px-4 text-xs")}
            disabled={busy}
            onClick={() => void brief()}
          >
            <Sparkles className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
            <span className="hidden @md:inline">
              {busy
                ? tr(["Pensando…", "Thinking…", "Pensando…", "Réflexion…"])
                : ops.length
                  ? tr(["Gerar de novo", "Generate again", "Generar de nuevo", "Générer à nouveau"])
                  : tr([
                      "Gerar oportunidades",
                      "Generate opportunities",
                      "Generar oportunidades",
                      "Générer des opportunités",
                    ])}
            </span>
          </button>
        }
      >
        {busy ? (
          <ul className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="st-shimmer h-44 rounded-[1.4rem] bg-secondary" />
            ))}
          </ul>
        ) : ops.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            color={GREEN}
            title={tr([
              "Peça as oportunidades da semana",
              "Ask for this week’s opportunities",
              "Pide las oportunidades de la semana",
              "Demandez les opportunités de la semaine",
            ])}
            text={tr([
              "Não são tendências ao vivo do Instagram (a rede não libera esses dados): confira também o painel de tendências da própria rede.",
              "These aren’t live Instagram trends (the network doesn’t share that data): also check the network’s own trends panel.",
              "No son tendencias en vivo de Instagram (la red no libera esos datos): revisa también el panel de tendencias de la propia red.",
              "Ce ne sont pas des tendances Instagram en direct (le réseau ne partage pas ces données) : consultez aussi le panneau des tendances du réseau.",
            ])}
            action={
              <button type="button" className={btnPrimary} onClick={() => void brief()}>
                <Sparkles className="h-4 w-4" />{" "}
                {tr([
                  "Gerar oportunidades",
                  "Generate opportunities",
                  "Generar oportunidades",
                  "Générer des opportunités",
                ])}
              </button>
            }
          />
        ) : (
          <ul className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {ops.map((o, k) => {
              const c = OP_COLORS[k % OP_COLORS.length];
              return (
                <li key={o.titulo} className="min-w-0">
                  <article
                    className="nc-tile-in flex h-full min-w-0 flex-col rounded-[1.4rem] border p-3.5"
                    style={{
                      animationDelay: `${k * 60}ms`,
                      background: `linear-gradient(150deg, ${tint(c, 14)}, var(--card) 70%)`,
                      borderColor: `color-mix(in srgb, ${c} 25%, transparent)`,
                    }}
                  >
                    <header className="flex min-w-0 items-start gap-2.5">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                        style={{ background: badgeBg(c) }}
                      >
                        <Flame className="h-4 w-4" />
                      </span>
                      <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug text-foreground">
                        {o.titulo}
                      </h3>
                    </header>
                    <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                      {o.por_que}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/90">{o.ideia}</p>
                    {(o.formato || o.quando) && (
                      <p className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                        {o.formato && (
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{ background: tint(c, 16), color: c }}
                          >
                            {o.formato}
                          </span>
                        )}
                        {o.quando && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-foreground/80">
                            {o.quando}
                          </span>
                        )}
                      </p>
                    )}
                    <div className="mt-auto pt-3">
                      <button
                        type="button"
                        onClick={() => onCreate(`${o.titulo}: ${o.ideia}`)}
                        className="group inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                        style={{ background: c }}
                      >
                        {tr([
                          "Criar ideias com isto",
                          "Create ideas from this",
                          "Crear ideas con esto",
                          "Créer des idées à partir de ceci",
                        ])}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </StudioCard>

      <div className="grid min-w-0 gap-4 @4xl:grid-cols-2">
        <StudioCard
          icon={Flame}
          color="#d9692a"
          title={tr([
            "Em alta no NutriConnect",
            "Trending on NutriConnect",
            "En tendencia en NutriConnect",
            "Tendances sur NutriConnect",
          ])}
          hint={tr([
            "Últimos 14 dias, só publicações públicas fora das comunidades",
            "Last 14 days, only public posts outside communities",
            "Últimos 14 días, solo publicaciones públicas fuera de las comunidades",
            "14 derniers jours, uniquement les publications publiques hors communautés",
          ])}
          delay={80}
        >
          {trends.error ? (
            <EmptyState
              icon={Flame}
              color="#d6456b"
              title={tr([
                "Não deu para carregar",
                "Couldn’t load",
                "No se pudo cargar",
                "Chargement impossible",
              ])}
              text={(trends.error as Error).message}
            />
          ) : !t ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="st-shimmer h-10 rounded-2xl bg-secondary" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {t.theme?.title && (
                <div
                  className="flex min-w-0 items-center gap-2.5 rounded-2xl p-2.5"
                  style={{ background: tint("#4f8a4b", 12) }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
                    style={{ background: badgeBg("#4f8a4b") }}
                  >
                    <Megaphone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4f8a4b]">
                      {tr([
                        "Tema da semana",
                        "Theme of the week",
                        "Tema de la semana",
                        "Thème de la semaine",
                      ])}
                    </span>
                    <span className="block truncate text-sm font-bold text-foreground">
                      {t.theme.title}
                    </span>
                  </span>
                </div>
              )}

              {t.top_tags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {tr([
                      "Assuntos mais usados",
                      "Most used topics",
                      "Temas más usados",
                      "Sujets les plus utilisés",
                    ])}
                  </p>
                  <ul className="space-y-1">
                    {t.top_tags.slice(0, 8).map((x) => (
                      <li key={x.tag} className="flex min-w-0 items-center gap-2 text-xs">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-[#d9692a]" />
                        <span className="w-28 shrink-0 truncate font-semibold text-foreground">
                          {x.tag}
                        </span>
                        <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(x.n / maxTag) * 100}%`,
                              background: "linear-gradient(90deg, #d9692a, #f6b07a)",
                            }}
                          />
                        </span>
                        <span className="w-6 shrink-0 text-right font-bold text-muted-foreground">
                          {x.n}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tr([
                    "Publicações que mais engajaram",
                    "Most engaging posts",
                    "Publicaciones con más interacción",
                    "Publications les plus engageantes",
                  ])}
                </p>
                {t.top_posts.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                    {tr([
                      "Ainda pouco movimento público.",
                      "Little public activity so far.",
                      "Aún hay poco movimiento público.",
                      "Encore peu d’activité publique.",
                    ])}
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {t.top_posts.map((p, i) => (
                      <li
                        key={i}
                        className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-border/60 bg-card px-2.5 py-2"
                      >
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: MEDAL[i] ?? "#9ca3af" }}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                          {p.title}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                          <span
                            className="inline-flex items-center gap-0.5"
                            title={tr(["Apoios", "Supports", "Apoyos", "Soutiens"])}
                          >
                            <Heart className="h-3 w-3 text-[#d6456b]" /> {p.reactions}
                          </span>
                          <span
                            className="inline-flex items-center gap-0.5"
                            title={tr(["Comentários", "Comments", "Comentarios", "Commentaires"])}
                          >
                            <MessageCircle className="h-3 w-3 text-[#3b7bbf]" /> {p.comments}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {t.challenges.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {tr([
                      "Desafios mais procurados",
                      "Most popular challenges",
                      "Desafíos más buscados",
                      "Défis les plus populaires",
                    ])}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {t.challenges.map((c) => (
                      <li
                        key={c.title}
                        className="inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          background: tint("#c58a12", 14),
                          color: "color-mix(in srgb, #c58a12 75%, var(--foreground))",
                        }}
                      >
                        <Trophy className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.title}</span>
                        <span className="inline-flex shrink-0 items-center gap-0.5 opacity-80">
                          <Users className="h-3 w-3" /> {c.people}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </StudioCard>

        <div className="min-w-0 space-y-4">
          <StudioCard
            icon={CalendarHeart}
            color="#d6456b"
            title={tr([
              "Datas de saúde chegando",
              "Upcoming health dates",
              "Fechas de salud próximas",
              "Dates santé à venir",
            ])}
            hint={tr([
              "Deste mês e do próximo",
              "This month and next",
              "De este mes y del próximo",
              "Ce mois-ci et le suivant",
            ])}
            delay={140}
          >
            {dates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {tr([
                  "Nenhuma data cadastrada para agora.",
                  "No dates registered for now.",
                  "No hay fechas registradas por ahora.",
                  "Aucune date enregistrée pour le moment.",
                ])}
              </p>
            ) : (
              <ul className="space-y-2">
                {dates.map((d) => (
                  <li key={`${d.month}-${d.title}`} className="flex min-w-0 gap-2.5">
                    <span
                      className="grid h-10 w-10 shrink-0 place-content-center rounded-xl text-center leading-none"
                      style={{ background: tint("#d6456b", 14), color: "#d6456b" }}
                    >
                      {d.day ? (
                        <>
                          <span className="text-sm font-bold">{d.day}</span>
                          <span className="mt-0.5 text-[9px] font-bold uppercase">
                            {new Date(2000, d.month - 1, 1)
                              .toLocaleDateString(locale, { month: "short" })
                              .replace(".", "")}
                          </span>
                        </>
                      ) : (
                        <Megaphone className="mx-auto h-4 w-4" />
                      )}
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
            )}
          </StudioCard>

          {season.length > 0 && (
            <StudioCard
              icon={Leaf}
              color="#4f8a4b"
              title={tr([
                "Na estação (Sudeste)",
                "In season (Southeast Brazil)",
                "De temporada (Sudeste)",
                "De saison (Sud-Est)",
              ])}
              hint={tr([
                "Frutas, verduras e legumes do mês",
                "Fruits and vegetables of the month",
                "Frutas, verduras y hortalizas del mes",
                "Fruits et légumes du mois",
              ])}
              delay={200}
            >
              <ul className="flex flex-wrap gap-1.5">
                {season.map((s) => (
                  <li
                    key={s}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: tint("#4f8a4b", 13),
                      color: "color-mix(in srgb, #4f8a4b 75%, var(--foreground))",
                    }}
                  >
                    {s}
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
