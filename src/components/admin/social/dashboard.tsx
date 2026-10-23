// Início do estúdio de redes sociais, no estilo da página de Funções: destaque com a Nina e ícones
// flutuando, atalhos em tiles coloridos, números do funil, modelos em destaque, posts recentes, os
// próximos 7 dias e as datas de saúde que rendem post.
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CalendarHeart,
  Camera,
  Clock,
  Heart,
  KanbanSquare,
  LayoutTemplate,
  Lightbulb,
  Megaphone,
  PenLine,
  Plus,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { NinaLive } from "@/components/nina-live";
import { upcomingHealthDates } from "@/lib/social-calendar";
import {
  FORMAT_LABEL,
  NETWORK_LABEL,
  STATUS_LABEL,
  type PostStatus,
  type SocialPost,
} from "@/lib/social-studio";
import type { Network, PostFormat } from "@/lib/social-studio.functions";
import { TEMPLATES, type SocialTemplate } from "@/lib/social-templates";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import { EmptyState, Floaters, SectionTitle, Tile } from "@/components/admin/social/kit";
import {
  NETWORK_STYLE,
  STATUS_STYLE,
  badgeBg,
  btnPrimary,
  tint,
} from "@/components/admin/social/kit-styles";
import { PostThumb, TemplateThumb } from "@/components/admin/social/template-thumb";

export type StudioTab =
  "inicio" | "quadro" | "ideias" | "modelos" | "calendario" | "tendencias" | "perfis";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const FEATURED = [
  "trocas-mercado",
  "editorial-cafe",
  "guia-alimentar",
  "enquete-feed",
  "receita-rapida",
  "moldura-lembrete",
];

export function StudioDashboard({
  posts,
  onNew,
  onTemplate,
  onOpen,
  go,
}: {
  posts: SocialPost[];
  onNew: (date?: string) => void;
  onTemplate: (t: SocialTemplate) => void;
  onOpen: (p: SocialPost) => void;
  go: (tab: StudioTab) => void;
}) {
  const tr = useTr();
  const { locale } = useI18n();
  const real = posts.filter((p) => !p.is_template);
  const today = new Date();
  const month = iso(today).slice(0, 7);
  const count = (s: PostStatus) => real.filter((p) => p.status === s).length;
  const publishedMonth = real.filter(
    (p) => p.status === "publicado" && (p.scheduled_for ?? p.updated_at).slice(0, 7) === month,
  ).length;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const dates = upcomingHealthDates().slice(0, 5);
  const recent = real.slice(0, 6);
  const featured = FEATURED.map((id) => TEMPLATES.find((t) => t.id === id)).filter(
    (t): t is SocialTemplate => !!t,
  );
  const scheduledWeek = real.filter(
    (p) => p.scheduled_for && week.some((d) => iso(d) === p.scheduled_for),
  ).length;

  const stats: { status: PostStatus; label: string; value: number }[] = [
    { status: "ideia", label: tr(["Ideias", "Ideas", "Ideas", "Idées"]), value: count("ideia") },
    {
      status: "rascunho",
      label: tr(["Rascunhos", "Drafts", "Borradores", "Brouillons"]),
      value: count("rascunho"),
    },
    {
      status: "agendado",
      label: tr(["Agendados", "Scheduled", "Programados", "Programmés"]),
      value: count("agendado") + count("aprovado"),
    },
    {
      status: "publicado",
      label: tr([
        "Publicados no mês",
        "Published this month",
        "Publicados en el mes",
        "Publiés ce mois-ci",
      ]),
      value: publishedMonth,
    },
  ];

  return (
    <div className="@container min-w-0 space-y-7">
      <Hero
        scheduledWeek={scheduledWeek}
        drafts={count("rascunho")}
        onNew={() => onNew()}
        onIdeas={() => go("ideias")}
      />

      {/* Atalhos */}
      <section className="min-w-0">
        <SectionTitle icon={Wand2} color="#7a5cc4">
          {tr(["Criar e planejar", "Create and plan", "Crear y planificar", "Créer et planifier"])}
        </SectionTitle>
        <ul className="grid auto-rows-[minmax(8.5rem,auto)] grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-6">
          <li className="col-span-2">
            <Tile
              icon={Plus}
              color="#b4532a"
              color2="#f6c27a"
              title={tr(["Criar post", "Create post", "Crear post", "Créer un post"])}
              text={tr([
                "Modelo, IA ou do zero, com prévia em cada rede",
                "Template, AI or from scratch, with a preview for each network",
                "Plantilla, IA o desde cero, con vista previa en cada red",
                "Modèle, IA ou à partir de zéro, avec un aperçu pour chaque réseau",
              ])}
              onClick={() => onNew()}
              delay={0}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 -top-6 h-28 w-28 rounded-full opacity-25 transition duration-500 group-hover:scale-125"
                style={{ background: "#f6c27a" }}
              />
            </Tile>
          </li>
          <li>
            <Tile
              icon={Sparkles}
              color="#7a5cc4"
              color2="#c4b0f0"
              title={tr(["Ideias com IA", "AI ideas", "Ideas con IA", "Idées avec l’IA"])}
              text={tr([
                "Sugestões prontas para o perfil",
                "Ready-made suggestions for the profile",
                "Sugerencias listas para el perfil",
                "Suggestions prêtes pour le profil",
              ])}
              onClick={() => go("ideias")}
              delay={45}
            />
          </li>
          <li>
            <Tile
              icon={LayoutTemplate}
              color="#c58a12"
              color2="#f6d38b"
              title={tr(["Modelos", "Templates", "Plantillas", "Modèles"])}
              text={`${TEMPLATES.length} ${tr(["prontos + da equipe", "ready-made + team", "listas + del equipo", "prêts + de l’équipe"])}`}
              onClick={() => go("modelos")}
              delay={90}
            />
          </li>
          <li>
            <Tile
              icon={CalendarDays}
              color="#d6456b"
              color2="#f39bb0"
              title={tr(["Calendário", "Calendar", "Calendario", "Calendrier"])}
              text={tr([
                "O mês inteiro de posts",
                "The whole month of posts",
                "El mes entero de posts",
                "Tout le mois de posts",
              ])}
              onClick={() => go("calendario")}
              delay={135}
            />
          </li>
          <li>
            <Tile
              icon={TrendingUp}
              color="#2f8a5b"
              color2="#9fd18c"
              title={tr(["Tendências", "Trends", "Tendencias", "Tendances"])}
              text={tr([
                "O que está em alta agora",
                "What’s trending now",
                "Lo que está en tendencia ahora",
                "Ce qui est tendance en ce moment",
              ])}
              onClick={() => go("tendencias")}
              delay={180}
            />
          </li>
        </ul>
      </section>

      {/* Funil */}
      <section className="min-w-0">
        <SectionTitle
          icon={KanbanSquare}
          color="#3b7bbf"
          right={
            <button
              type="button"
              onClick={() => go("quadro")}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              {tr(["Abrir quadro", "Open board", "Abrir tablero", "Ouvrir le tableau"])}{" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          {tr(["Produção", "Production", "Producción", "Production"])}
        </SectionTitle>
        <ul className="grid grid-cols-2 gap-3 @4xl:grid-cols-4">
          {stats.map((s, k) => {
            const st = STATUS_STYLE[s.status];
            return (
              <li key={s.label} className="min-w-0">
                <button
                  type="button"
                  onClick={() => go("quadro")}
                  className="nc-tile-in nc-tile group flex h-full w-full items-center gap-3 rounded-[1.4rem] border p-3.5 text-left"
                  style={
                    {
                      animationDelay: `${k * 60}ms`,
                      background: `linear-gradient(140deg, ${tint(st.color, 14)}, ${tint(st.color, 6)})`,
                      borderColor: `color-mix(in srgb, ${st.color} 22%, transparent)`,
                      "--tile": st.color,
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-110"
                    style={{ background: badgeBg(st.color) }}
                  >
                    <st.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <CountUp
                      value={s.value}
                      className="block font-display text-2xl font-bold leading-none text-foreground"
                    />
                    <span className="mt-1 block truncate text-[11px] font-semibold text-muted-foreground">
                      {s.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid min-w-0 gap-7 @5xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-7">
          {/* Modelos em destaque */}
          <section className="min-w-0">
            <SectionTitle
              icon={LayoutTemplate}
              color="#c58a12"
              right={
                <button
                  type="button"
                  onClick={() => go("modelos")}
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  {tr(["Ver todos", "See all", "Ver todos", "Tout voir"])}{" "}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              }
            >
              {tr([
                "Comece por um modelo",
                "Start from a template",
                "Empieza con una plantilla",
                "Commencez par un modèle",
              ])}
            </SectionTitle>
            <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @6xl:grid-cols-6">
              {featured.map((t, k) => (
                <li key={t.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onTemplate(t)}
                    className="nc-tile-in st-card group block w-full overflow-hidden rounded-[1.25rem] border border-border/60 bg-card text-left"
                    style={{ animationDelay: `${k * 50}ms` }}
                  >
                    <div className="relative overflow-hidden">
                      <TemplateThumb
                        template={t}
                        className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.04]"
                      />
                      <span className="absolute inset-x-2 bottom-2 flex translate-y-2 items-center justify-center gap-1 rounded-full bg-white/95 py-1.5 text-[11px] font-bold text-neutral-900 opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Sparkles className="h-3 w-3" />{" "}
                        {tr([
                          "Usar modelo",
                          "Use template",
                          "Usar plantilla",
                          "Utiliser le modèle",
                        ])}
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="truncate text-xs font-bold text-foreground">{t.name}</p>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {NETWORK_LABEL[t.network]} · {FORMAT_LABEL[t.format]}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Recentes */}
          <section className="min-w-0">
            <SectionTitle
              icon={PenLine}
              color="#3b7bbf"
              right={
                recent.length ? (
                  <button
                    type="button"
                    onClick={() => go("quadro")}
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    {tr(["Ver todos", "See all", "Ver todos", "Tout voir"])}{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            >
              {tr([
                "Mexidos por último",
                "Recently edited",
                "Editados recientemente",
                "Modifiés récemment",
              ])}
            </SectionTitle>
            {recent.length === 0 ? (
              <EmptyState
                icon={Wand2}
                color="#3b7bbf"
                title={tr([
                  "Nenhum post ainda",
                  "No posts yet",
                  "Aún no hay posts",
                  "Aucun post pour l’instant",
                ])}
                text={tr([
                  "Comece por um modelo pronto ou peça uma ideia para a IA.",
                  "Start from a ready-made template or ask the AI for an idea.",
                  "Empieza con una plantilla lista o pide una idea a la IA.",
                  "Commencez par un modèle prêt ou demandez une idée à l’IA.",
                ])}
                action={
                  <button type="button" className={btnPrimary} onClick={() => onNew()}>
                    <Plus className="h-4 w-4" />{" "}
                    {tr([
                      "Criar o primeiro post",
                      "Create the first post",
                      "Crear el primer post",
                      "Créer le premier post",
                    ])}
                  </button>
                }
              />
            ) : (
              <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @6xl:grid-cols-6">
                {recent.map((p, k) => {
                  const net = NETWORK_STYLE[p.network as Network] ?? NETWORK_STYLE.outro;
                  const st = STATUS_STYLE[p.status as PostStatus] ?? STATUS_STYLE.rascunho;
                  return (
                    <li key={p.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpen(p)}
                        className="nc-tile-in st-card group block w-full overflow-hidden rounded-[1.25rem] border border-border/60 bg-card text-left"
                        style={{ animationDelay: `${k * 50}ms` }}
                      >
                        <div className="relative overflow-hidden">
                          <PostThumb
                            post={p}
                            className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.04]"
                          />
                        </div>
                        <div className="px-3 py-2.5">
                          <p className="truncate text-xs font-bold text-foreground">{p.title}</p>
                          <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                            <span
                              className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-white"
                              style={{ background: badgeBg(net.color) }}
                              title={NETWORK_LABEL[p.network as Network]}
                            >
                              <net.icon className="h-3 w-3" />
                            </span>
                            <span
                              className="inline-flex h-5 min-w-0 items-center gap-1 rounded-full px-1.5 text-[10px] font-bold"
                              style={{ background: tint(st.color, 14), color: st.color }}
                            >
                              <st.icon className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {STATUS_LABEL[p.status as PostStatus]}
                              </span>
                            </span>
                            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                              {FORMAT_LABEL[p.format as PostFormat]}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-7">
          {/* Próximos 7 dias */}
          <section className="min-w-0">
            <SectionTitle
              icon={Clock}
              color="#d6456b"
              right={
                <button
                  type="button"
                  onClick={() => go("calendario")}
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  {tr(["Mês", "Month", "Mes", "Mois"])} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              }
            >
              {tr(["Próximos 7 dias", "Next 7 days", "Próximos 7 días", "7 prochains jours"])}
            </SectionTitle>
            <ol className="nc-tile-in space-y-1.5 rounded-[1.4rem] border border-border/60 bg-card p-2.5">
              {week.map((day) => {
                const key = iso(day);
                const items = real.filter((p) => p.scheduled_for === key);
                const isToday = key === iso(today);
                return (
                  <li key={key} className="flex min-w-0 items-start gap-2.5 rounded-xl p-1">
                    <span
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-center leading-none",
                        isToday ? "text-white shadow-md" : "bg-secondary/80 text-foreground",
                      )}
                      style={isToday ? { background: badgeBg("#d6456b") } : undefined}
                    >
                      <span>
                        <span className="block text-[9px] font-semibold uppercase">
                          {day.toLocaleDateString(locale, { weekday: "short" }).replace(".", "")}
                        </span>
                        <span className="mt-0.5 block text-sm font-bold">{day.getDate()}</span>
                      </span>
                    </span>
                    <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                      {items.length ? (
                        items.map((p) => {
                          const net = NETWORK_STYLE[p.network as Network] ?? NETWORK_STYLE.outro;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => onOpen(p)}
                              className="flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg px-2 text-left text-xs font-semibold text-foreground transition hover:brightness-95"
                              style={{ background: tint(net.color, 12) }}
                            >
                              <net.icon
                                className="h-3.5 w-3.5 shrink-0"
                                style={{ color: net.color }}
                              />
                              <span className="truncate">{p.title}</span>
                            </button>
                          );
                        })
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNew(key)}
                          className="flex h-8 w-full items-center gap-1 rounded-lg border border-dashed border-border/80 px-2 text-left text-[11px] text-muted-foreground transition hover:border-accent hover:text-accent"
                        >
                          <Plus className="h-3 w-3" />{" "}
                          {tr(["Planejar", "Plan", "Planificar", "Planifier"])}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Datas */}
          <section className="min-w-0">
            <SectionTitle icon={CalendarHeart} color="#2f8a5b">
              {tr([
                "Datas que rendem post",
                "Dates worth a post",
                "Fechas que dan para un post",
                "Dates qui valent un post",
              ])}
            </SectionTitle>
            <ul className="space-y-2">
              {dates.map((d, k) => (
                <li
                  key={d.title}
                  className="nc-tile-in flex min-w-0 gap-3 rounded-[1.2rem] border p-3"
                  style={{
                    animationDelay: `${k * 50}ms`,
                    background: `linear-gradient(140deg, ${tint("#2f8a5b", 10)}, var(--card))`,
                    borderColor: "color-mix(in srgb, #2f8a5b 18%, transparent)",
                  }}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-center leading-none shadow-xs">
                    <span>
                      <span className="block text-sm font-bold text-foreground">
                        {d.day ?? "•"}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">
                        {new Date(2026, d.month - 1, 1)
                          .toLocaleDateString(locale, { month: "short" })
                          .replace(".", "")}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold leading-snug text-foreground">
                      {d.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">
                      {d.angle}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Hero({
  scheduledWeek,
  drafts,
  onNew,
  onIdeas,
}: {
  scheduledWeek: number;
  drafts: number;
  onNew: () => void;
  onIdeas: () => void;
}) {
  const tr = useTr();
  const [action, setAction] = useState<"wave" | "talk" | "idle">("wave");
  useEffect(() => {
    const a = window.setTimeout(() => setAction("talk"), 1800);
    const b = window.setTimeout(() => setAction("idle"), 4200);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);
  const hour = new Date().getHours();
  const hello =
    hour < 12
      ? tr(["Bom dia", "Good morning", "Buenos días", "Bonjour"])
      : hour < 18
        ? tr(["Boa tarde", "Good afternoon", "Buenas tardes", "Bon après-midi"])
        : tr(["Boa noite", "Good evening", "Buenas noches", "Bonsoir"]);
  return (
    <section
      className="nc-tile-in nc-gradient-pan relative overflow-hidden rounded-[2rem] border border-border/60 p-4 shadow-soft sm:p-6"
      style={{
        background:
          "linear-gradient(120deg, color-mix(in srgb, #f6c27a 30%, var(--card)), color-mix(in srgb, #9fd18c 26%, var(--card)), color-mix(in srgb, #9fb0f0 26%, var(--card)), color-mix(in srgb, #f39bb0 26%, var(--card)))",
      }}
    >
      <Floaters
        items={[
          { icon: Heart, color: "#d6456b", className: "left-[48%] top-4", delay: "0s" },
          { icon: Camera, color: "#3b7bbf", className: "right-8 top-6", delay: "-1.4s" },
          { icon: Megaphone, color: "#d9692a", className: "right-[30%] bottom-5", delay: "-2.2s" },
          { icon: Sparkles, color: "#c58a12", className: "right-[12%] bottom-10", delay: "-3s" },
          { icon: Lightbulb, color: "#7a5cc4", className: "left-[64%] bottom-6", delay: "-0.6s" },
        ]}
      />
      <div className="relative flex items-center gap-3 sm:gap-5">
        <NinaLive
          action={action}
          framing="bust"
          className="h-28 w-24 shrink-0 sm:h-36 sm:w-32"
          label={tr([
            "Nutri Nina acenando",
            "Nutri Nina waving",
            "Nutri Nina saludando",
            "Nutri Nina fait coucou",
          ])}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/60">
            {tr([
              "Estúdio de redes sociais",
              "Social media studio",
              "Estudio de redes sociales",
              "Studio des réseaux sociaux",
            ])}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {tr([
              "O que vamos publicar hoje?",
              "What are we posting today?",
              "¿Qué vamos a publicar hoy?",
              "Qu’allons-nous publier aujourd’hui ?",
            ])}
          </h1>
          <p className="relative mt-2 inline-block max-w-full rounded-2xl rounded-tl-sm bg-card/90 px-3 py-2 text-sm font-medium text-foreground shadow-xs">
            {hello}!{" "}
            {scheduledWeek === 1
              ? tr([
                  "1 post agendado para esta semana.",
                  "1 post scheduled for this week.",
                  "1 post programado para esta semana.",
                  "1 post programmé cette semaine.",
                ])
              : scheduledWeek
                ? `${scheduledWeek} ${tr(["posts agendados para esta semana.", "posts scheduled for this week.", "posts programados para esta semana.", "posts programmés cette semaine."])}`
                : tr([
                    "Nada agendado para esta semana ainda. Vamos planejar?",
                    "Nothing scheduled for this week yet. Shall we plan?",
                    "Nada programado para esta semana todavía. ¿Planificamos?",
                    "Rien de programmé cette semaine pour l’instant. On planifie ?",
                  ])}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip icon={CalendarDays} color="#d6456b">
              {scheduledWeek} {tr(["na semana", "this week", "en la semana", "cette semaine"])}
            </Chip>
            <Chip icon={PenLine} color="#3b7bbf">
              {drafts}{" "}
              {drafts === 1
                ? tr(["rascunho", "draft", "borrador", "brouillon"])
                : tr(["rascunhos", "drafts", "borradores", "brouillons"])}
            </Chip>
            <button
              type="button"
              onClick={onNew}
              className="group inline-flex h-7 items-center gap-1 rounded-full bg-accent px-3 text-[11px] font-bold text-accent-foreground shadow-soft transition hover:bg-accent/90"
            >
              <Plus className="h-3.5 w-3.5" />{" "}
              {tr(["Criar post", "Create post", "Crear post", "Créer un post"])}
            </button>
            <button
              type="button"
              onClick={onIdeas}
              className="group inline-flex h-7 items-center gap-1 rounded-full bg-card/90 px-3 text-[11px] font-bold text-foreground shadow-xs transition hover:bg-card"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#7a5cc4]" />{" "}
              {tr(["Ideias com IA", "AI ideas", "Ideas con IA", "Idées avec l’IA"])}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({
  icon: Icon,
  color,
  children,
}: {
  icon: typeof Heart;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold"
      style={{ background: `color-mix(in srgb, ${color} 16%, var(--card))`, color }}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** Número que sobe até o valor (respeita reduzir movimento). */
function CountUp({ value, className }: { value: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || value === 0) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={cn("tabular-nums", className)}>{n}</span>;
}
