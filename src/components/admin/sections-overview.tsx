import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Flag,
  Inbox,
  MessageSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  UserX,
  EyeOff,
  ShieldCheck,
  FileText,
  Percent,
} from "lucide-react";
import { BarChart, Panel, QueryError, StatCard } from "@/components/admin/admin-ui";
import { money, useOverview, useSettings, type Overview, type SeriesPoint } from "@/lib/admin-api";
import { useTr } from "@/components/settings-ui";
import type { SectionId } from "@/components/admin/sections";

const dm = (day: string) => {
  const d = new Date(day + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const series = (v: unknown): SeriesPoint[] =>
  Array.isArray(v)
    ? v.filter((p): p is SeriesPoint => !!p && typeof (p as SeriesPoint).day === "string")
    : [];

/** Completa o que faltar na resposta do banco: um dado ausente vira 0, sem derrubar a seção. */
function normalize(raw: unknown): Overview {
  const r = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >;
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(r)) out[k] = v;
  const keys: (keyof Overview)[] = [
    "users_total",
    "users_7d",
    "users_30d",
    "pros",
    "admins",
    "suspended",
    "posts_total",
    "posts_today",
    "posts_7d",
    "posts_hidden",
    "comments_7d",
    "reports_pending",
    "reports_ai_pending",
    "verifications_pending",
    "communities_total",
    "communities_attention",
    "appointments_7d",
    "appointments_upcoming",
    "paid_cents",
    "fees_cents",
    "refunded_cents",
    "contact_new",
    "nina_today",
    "summary_today",
    "moderation_today",
  ];
  for (const k of keys) out[k] = num(r[k]);
  out.signups = series(r.signups);
  out.posts_series = series(r.posts_series);
  return out as unknown as Overview;
}

/** Soma dos últimos 7 dias e dos 7 anteriores de uma série diária. */
function weekOverWeek(points: SeriesPoint[]) {
  const vals = points.map((p) => num(p.n));
  const last = vals.slice(-7).reduce((a, b) => a + b, 0);
  const prev = vals.slice(-14, -7).reduce((a, b) => a + b, 0);
  return { last, prev, enough: vals.length >= 14 };
}

export function OverviewSection({ go }: { go: (id: SectionId) => void }) {
  const tr = useTr();
  const { data, error, isLoading } = useOverview();
  const settings = useSettings();

  if (error) return <QueryError error={error} />;
  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground">
        {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
      </p>
    );

  const o = normalize(data);
  const today = new Date().toISOString().slice(0, 10);

  const attention = [
    {
      id: "moderacao" as const,
      label: tr([
        "Denúncias pendentes",
        "Pending reports",
        "Denuncias pendientes",
        "Signalements en attente",
      ]),
      value: o.reports_pending,
      sub: o.reports_ai_pending
        ? `${o.reports_ai_pending} ${
            o.reports_ai_pending === 1
              ? tr(["vinda da IA", "from the AI", "de la IA", "venant de l'IA"])
              : tr(["vindas da IA", "from the AI", "de la IA", "venant de l'IA"])
          }`
        : undefined,
      icon: Flag,
    },
    {
      id: "verificacoes" as const,
      label: tr([
        "Verificações aguardando",
        "Verifications waiting",
        "Verificaciones en espera",
        "Vérifications en attente",
      ]),
      value: o.verifications_pending,
      icon: BadgeCheck,
    },
    {
      id: "contato" as const,
      label: tr([
        "Mensagens novas (Fale conosco)",
        "New messages (Contact us)",
        "Mensajes nuevos (Contáctanos)",
        "Nouveaux messages (Contact)",
      ]),
      value: o.contact_new,
      icon: Inbox,
    },
    {
      id: "comunidades" as const,
      label: tr([
        "Comunidades com pendência",
        "Communities needing attention",
        "Comunidades con pendientes",
        "Communautés à traiter",
      ]),
      value: o.communities_attention,
      icon: Users,
    },
    {
      id: "posts" as const,
      label: tr(["Posts ocultos", "Hidden posts", "Posts ocultos", "Posts masqués"]),
      value: o.posts_hidden,
      icon: EyeOff,
    },
    {
      id: "usuarios" as const,
      label: tr([
        "Contas suspensas",
        "Suspended accounts",
        "Cuentas suspendidas",
        "Comptes suspendus",
      ]),
      value: o.suspended,
      icon: UserX,
    },
  ];
  const urgent = attention.filter((a) => a.value > 0).length;

  const limits = settings.data ?? {};
  const usage = [
    {
      label: tr(["Nina (perguntas)", "Nina (questions)", "Nina (preguntas)", "Nina (questions)"]),
      used: o.nina_today,
      limit: limits.ai_limit_nina,
    },
    {
      label: tr([
        "Resumos clínicos",
        "Clinical summaries",
        "Resúmenes clínicos",
        "Résumés cliniques",
      ]),
      used: o.summary_today,
      limit: limits.ai_limit_summary,
    },
    {
      label: tr([
        "Análises de moderação",
        "Moderation checks",
        "Análisis de moderación",
        "Analyses de modération",
      ]),
      used: o.moderation_today,
      limit: limits.ai_limit_moderation,
    },
  ];

  const in7 = tr(["em 7 dias", "in 7 days", "en 7 días", "en 7 jours"]);
  const usersWow = weekOverWeek(o.signups);
  const postsWow = weekOverWeek(o.posts_series);

  /** "▲ 20% vs. semana anterior" (só quando há 14 dias de série). */
  const trend = ({ last, prev, enough }: ReturnType<typeof weekOverWeek>) => {
    if (!enough) return undefined;
    const vsPrev = tr([
      "vs. semana anterior",
      "vs. previous week",
      "vs. semana anterior",
      "vs. semaine précédente",
    ]);
    if (last === prev)
      return (
        <span>
          {tr([
            "igual à semana anterior",
            "same as last week",
            "igual a la semana anterior",
            "comme la semaine précédente",
          ])}
        </span>
      );
    const up = last > prev;
    const pct = prev === 0 ? null : Math.round((Math.abs(last - prev) / prev) * 100);
    const Icon = up ? TrendingUp : TrendingDown;
    return (
      <span className={`${up ? "text-primary" : "text-destructive"}`}>
        <Icon className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden />
        <span>
          {up ? tr(["subiu", "up", "subió", "hausse"]) : tr(["caiu", "down", "bajó", "baisse"])}
          {pct !== null ? ` ${pct}%` : ""} {vsPrev}
        </span>
      </span>
    );
  };

  const chartLabel = (title: string, points: SeriesPoint[]) => {
    const total = points.reduce((a, p) => a + num(p.n), 0);
    const peak = points.reduce<SeriesPoint | null>((m, p) => (!m || p.n > m.n ? p : m), null);
    return `${title}: ${tr(["total de", "total of", "total de", "total de"])} ${total} ${tr([
      "nos últimos 30 dias",
      "in the last 30 days",
      "en los últimos 30 días",
      "sur les 30 derniers jours",
    ])}${
      peak && peak.n > 0
        ? `; ${tr(["pico de", "peak of", "pico de", "pic de"])} ${peak.n} ${tr(["em", "on", "el", "le"])} ${dm(peak.day)}`
        : ""
    }.`;
  };

  const signupsTitle = tr([
    "Novas pessoas por dia",
    "New people per day",
    "Personas nuevas por día",
    "Nouvelles personnes par jour",
  ]);
  const postsTitle = tr([
    "Publicações por dia",
    "Posts per day",
    "Publicaciones por día",
    "Publications par jour",
  ]);
  const last30 = tr(["Últimos 30 dias", "Last 30 days", "Últimos 30 días", "30 derniers jours"]);
  const todayLabel = tr(["hoje", "today", "hoy", "aujourd'hui"]);

  return (
    <div className="space-y-5">
      <Panel
        title={tr(["Atenção agora", "Needs attention", "Atención ahora", "À traiter maintenant"])}
        hint={
          urgent === 0
            ? tr([
                "Tudo em dia. Nada esperando por você.",
                "All caught up. Nothing waiting for you.",
                "Todo al día. Nada esperándote.",
                "Tout est à jour. Rien ne vous attend.",
              ])
            : urgent === 1
              ? tr([
                  "1 assunto precisa da sua atenção.",
                  "1 item needs your attention.",
                  "1 asunto necesita tu atención.",
                  "1 sujet demande votre attention.",
                ])
              : `${urgent} ${tr([
                  "assuntos precisam da sua atenção.",
                  "items need your attention.",
                  "asuntos necesitan tu atención.",
                  "sujets demandent votre attention.",
                ])}`
        }
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {attention.map((a) => (
            <StatCard
              compact
              key={a.id}
              label={a.label}
              value={a.value}
              sub={a.sub}
              icon={a.icon}
              tone={a.value > 0 ? "alert" : "good"}
              onClick={() => go(a.id)}
            />
          ))}
        </div>
      </Panel>

      {/* Duas colunas já no celular (8 números) */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          compact
          label={tr([
            "Pessoas na plataforma",
            "People on the platform",
            "Personas en la plataforma",
            "Personnes sur la plateforme",
          ])}
          value={o.users_total}
          sub={
            <>
              +{o.users_7d} {in7}
              {trend(usersWow) && <span className="block">{trend(usersWow)}</span>}
            </>
          }
          icon={Users}
        />
        <StatCard
          compact
          label={tr([
            "Profissionais verificados",
            "Verified professionals",
            "Profesionales verificados",
            "Professionnels vérifiés",
          ])}
          value={o.pros}
          sub={
            o.admins === 1
              ? tr(["1 administrador", "1 admin", "1 administrador", "1 administrateur"])
              : `${o.admins} ${tr(["administradores", "admins", "administradores", "administrateurs"])}`
          }
          icon={ShieldCheck}
        />
        <StatCard
          compact
          label={tr(["Publicações", "Posts", "Publicaciones", "Publications"])}
          value={o.posts_total}
          sub={
            <>
              {o.posts_today} {tr(["em 24 h", "in 24 h", "en 24 h", "en 24 h"])} · {o.posts_7d}{" "}
              {in7}
              {trend(postsWow) && <span className="block">{trend(postsWow)}</span>}
            </>
          }
          icon={FileText}
        />
        <StatCard
          compact
          label={tr([
            "Comentários (7 dias)",
            "Comments (7 days)",
            "Comentarios (7 días)",
            "Commentaires (7 jours)",
          ])}
          value={o.comments_7d}
          icon={MessageSquare}
        />
        <StatCard
          compact
          label={tr([
            "Consultas próximas",
            "Upcoming appointments",
            "Próximas consultas",
            "Consultations à venir",
          ])}
          value={o.appointments_upcoming}
          sub={`${o.appointments_7d} ${tr([
            "marcadas em 7 dias",
            "booked in 7 days",
            "reservadas en 7 días",
            "réservées en 7 jours",
          ])}`}
          icon={CalendarClock}
        />
        <StatCard
          compact
          label={tr([
            "Recebido (aprovado)",
            "Received (approved)",
            "Recibido (aprobado)",
            "Reçu (approuvé)",
          ])}
          value={money(o.paid_cents)}
          sub={`${tr(["reembolsado", "refunded", "reembolsado", "remboursé"])}: ${money(o.refunded_cents)}`}
          icon={Banknote}
        />
        <StatCard
          compact
          label={tr([
            "Taxa da plataforma",
            "Platform fee",
            "Comisión de la plataforma",
            "Commission de la plateforme",
          ])}
          value={money(o.fees_cents)}
          sub={
            settings.data?.platform_fee_percent !== undefined
              ? `${settings.data.platform_fee_percent}% ${tr([
                  "por consulta",
                  "per appointment",
                  "por consulta",
                  "par consultation",
                ])}`
              : undefined
          }
          icon={Percent}
        />
        <StatCard
          compact
          label={tr([
            "Novos em 30 dias",
            "New in 30 days",
            "Nuevos en 30 días",
            "Nouveaux en 30 jours",
          ])}
          value={o.users_30d}
          icon={UserPlus}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={signupsTitle} hint={last30}>
          <BarChart
            data={o.signups.map((p) => ({ label: dm(p.day), value: num(p.n) }))}
            color="var(--chart-1)"
            ariaLabel={chartLabel(signupsTitle, o.signups)}
          />
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{dm(o.signups[0]?.day ?? today)}</span>
            <span>{todayLabel}</span>
          </div>
        </Panel>
        <Panel title={postsTitle} hint={last30}>
          <BarChart
            data={o.posts_series.map((p) => ({ label: dm(p.day), value: num(p.n) }))}
            color="var(--chart-2)"
            ariaLabel={chartLabel(postsTitle, o.posts_series)}
          />
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{dm(o.posts_series[0]?.day ?? today)}</span>
            <span>{todayLabel}</span>
          </div>
        </Panel>
      </div>

      <Panel
        title={tr([
          "Uso da IA hoje",
          "AI use today",
          "Uso de la IA hoy",
          "Usage de l'IA aujourd'hui",
        ])}
        hint={tr([
          "Contagem de usos hoje em relação ao limite diário por pessoa",
          "Uses today compared with the daily limit per person",
          "Usos de hoy frente al límite diario por persona",
          "Utilisations du jour par rapport à la limite quotidienne par personne",
        ])}
        action={
          <button
            type="button"
            onClick={() => go("ia")}
            className="min-h-6 text-xs font-semibold text-accent hover:underline"
          >
            {tr(["Ver detalhes →", "See details →", "Ver detalles →", "Voir le détail →"])}
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {usage.map((u) => (
            <div key={u.label} className="rounded-2xl bg-secondary/50 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> {u.label}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{u.used}</p>
              <p className="text-[11px] text-muted-foreground">
                {tr([
                  "limite por pessoa:",
                  "limit per person:",
                  "límite por persona:",
                  "limite par personne :",
                ])}{" "}
                {u.limit ?? "—"} {tr(["por dia", "per day", "por día", "par jour"])}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {urgent === 0 ? (
          <>
            <Activity className="h-3.5 w-3.5" />
            {tr([
              "Os números acima são ao vivo: recarregue para atualizar.",
              "The numbers above are live: reload to refresh.",
              "Los números de arriba son en vivo: recarga para actualizar.",
              "Les chiffres ci-dessus sont en direct : rechargez pour actualiser.",
            ])}
          </>
        ) : (
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            {tr([
              "Clique em um cartão de atenção para ir direto ao assunto.",
              "Click an attention card to go straight to it.",
              "Haz clic en una tarjeta de atención para ir directo al asunto.",
              "Cliquez sur une carte pour aller directement au sujet.",
            ])}
          </>
        )}
      </p>
    </div>
  );
}
